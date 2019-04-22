<?php
/**
* Репозиторий Doctrine ORM для работы с сущностями типа "CatalogueNodeItem"
*/
namespace App\Repository;

use App\Entity\CatalogueNodeItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Symfony\Bridge\Doctrine\RegistryInterface;
use App\Entity\Search\ItemQueryObject;

/**
* Репозиторий Doctrine ORM для работы с сущностями типа "CatalogueNodeItem"
*
 * @method CatalogueNodeItem|null find($id, $lockMode = null, $lockVersion = null)
 * @method CatalogueNodeItem|null findOneBy(array $criteria, array $orderBy = null)
 * @method CatalogueNodeItem[]    findAll()
 * @method CatalogueNodeItem[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class CatalogueNodeItemRepository extends ServiceEntityRepository
{
    /**
     * Конструктор класса
     * @param RegistryInterface $registry Внутренний инструмент работы с подключениями Doctrine ORM
     */
    public function __construct(RegistryInterface $registry)
    {
        parent::__construct($registry, CatalogueNodeItem::class);
    }

  /**
   * Выполняет поиск сущностей по заданным полям
   * @param ItemQueryObject $queryObject Объект поиска
    * @return CatalogueNodeItem[] Returns an array of CatalogueNodeItem objects
    */

    public function search(ItemQueryObject $queryObject)
    {
      $queryBuilder = $this->createQueryBuilder('c');
      if($queryObject->getField("name") != ""){
        $queryBuilder->andWhere('c.name LIKE :name')
        ->setParameter('name', '%'.$queryObject->getField("name").'%');
      }
      if(sizeof($queryObject->getField("code")) !== 0){
        $codeCounter = 0;
        foreach($queryObject->getField("code") as $code){
            $queryBuilder->orWhere('c.id LIKE :code'.$codeCounter)
            ->setParameter('code'.$codeCounter++, '%'.$code);
        }
      }
      if($queryObject->getField("article") != ""){
        $queryBuilder->andWhere('c.article LIKE :article')
        ->setParameter('article', '%'.$queryObject->getField("article").'%');
      }
      if($queryObject->getField("parent_name") != "" && $queryObject->getField("search_nested") == 0){
        $queryBuilder->leftJoin('c.node', 'parentn')
        ->andWhere('parentn.name LIKE :pnamen')
        ->orWhere('parentn.id LIKE :pcoden')
        ->setParameter('pnamen', '%'.$queryObject->getField("parent_name").'%')
        ->setParameter('pcoden', '%'.$queryObject->getField("parent_name"));
      }
      if($queryObject->getField("parent_name") != "" && $queryObject->getField("search_nested") == 1){
        $queryBuilder->leftJoin('c.node', 'parent')
       ->leftJoin('parent.parent', 'parent2')
       ->leftJoin('parent2.parent', 'parent3')
       ->leftJoin('parent3.parent', 'parent4')
       ->leftJoin('parent4.parent', 'parent5')
       ->leftJoin('parent5.parent', 'parent6')
       ->andWhere($queryBuilder->expr()->orX(
        $queryBuilder->expr()->like('parent.name', ':pname')
        ,$queryBuilder->expr()->like('parent2.name', ':pname')
        ,$queryBuilder->expr()->like('parent3.name', ':pname')
        ,$queryBuilder->expr()->like('parent4.name', ':pname')
        ,$queryBuilder->expr()->like('parent5.name', ':pname')
        ,$queryBuilder->expr()->like('parent6.name', ':pname')
        ,$queryBuilder->expr()->like('parent.id', ':pcode')
        ,$queryBuilder->expr()->like('parent2.id', ':pcode')
        ,$queryBuilder->expr()->like('parent3.id', ':pcode')
        ,$queryBuilder->expr()->like('parent4.id', ':pcode')
        ,$queryBuilder->expr()->like('parent5.id', ':pcode')
        ,$queryBuilder->expr()->like('parent6.id', ':pcode')
       ))
       // ->orderBy('parent.name,parent2.name,parent3.name,parent4.name,parent5.name,parent6.name','ASC')
       ->orderBy('c.name', 'ASC')
       ->setParameter('pname', '%'.$queryObject->getField("parent_name").'%')
       ->setParameter('pcode', '%'.$queryObject->getField("parent_name"));
     }
     // var_dump($queryObject);
     //  var_dump($queryBuilder->getDQL());
      return $queryBuilder->setMaxResults(100)->getQuery()->getResult();

    }

}
