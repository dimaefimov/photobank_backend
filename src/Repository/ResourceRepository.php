<?php
/**
* Репозиторий Doctrine ORM для работы с сущностями типа "Resource"
*/
namespace App\Repository;

use App\Entity\Resource;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Symfony\Bridge\Doctrine\RegistryInterface;
use App\Entity\Search\ResourceQueryObject;
use App\Entity\CatalogueNodeItem;
use App\Entity\GarbageNode;
use Doctrine\ORM\Query\Expr\Join;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
* Репозиторий Doctrine ORM для работы с сущностями типа "Resource"
*
 * @method Resource|null find($id, $lockMode = null, $lockVersion = null)
 * @method Resource|null findOneBy(array $criteria, array $orderBy = null)
 * @method Resource[]    findAll()
 * @method Resource[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ResourceRepository extends ServiceEntityRepository
{
  /**
   * Конструктор класса
   * @param RegistryInterface $registry Внутренний инструмент работы с подключениями Doctrine ORM
   */
    public function __construct(RegistryInterface $registry)
    {
        parent::__construct($registry, Resource::class);
    }

    /**
    * Выполняет поиск главного ресурса в группе
    *
    * @param CatalogueNodeItem $item Товар, которому принадлежит искомый ресурс
    *
    * @return Resource Найденный ресурс
    *
    */
    public function findOriginalResources($item)
    {
        $qb = $this->createQueryBuilder('r')
        ->andWhere('r.gid = r.id')
        ->orderBy('r.id', 'ASC');
        if($item instanceof CatalogueNodeItem){
          $qb->andWhere('r.item = :item')
          ->setParameter('item', $item);
        }elseif($item instanceof GarbageNode){
          $qb->andWhere('r.garbageNode = :item')
          ->setParameter('item', $item);
        }
        return $qb->getQuery()
        ->getResult();
    }

    /**
    * Выполняет поиск ресурса по разделу каталога во вложенных разделах
    *
    * @param CatalogueNode $node Раздел каталога, в котором проводится поиск
    *
    * @return Resource[] результат поиска
    *
    */
    public function getNestedResourcesByParent($node)
    {
      $queryBuilder = $this->createQueryBuilder('r');
      $queryBuilder->leftJoin('r.item', 'item')
       ->leftJoin('item.node', 'parent2')
       ->leftJoin('parent2.parent', 'parent3')
       ->leftJoin('parent3.parent', 'parent4')
       ->leftJoin('parent4.parent', 'parent5')
       ->leftJoin('parent5.parent', 'parent6')
       ->andWhere('r.autogenerated = 0')
       ->andWhere('item.id = :pcode')
       ->orWhere('parent2.id = :pcode')
       ->orWhere('parent3.id = :pcode')
       ->orWhere('parent4.id = :pcode')
       ->orWhere('parent5.id = :pcode')
       ->orWhere('parent6.id = :pcode')
       ->setParameter('pcode', $node);
      return $queryBuilder->setMaxResults(1500)->getQuery()->getResult();

    }

    /**
    * Получает ресурс с пресетом thumbnail(1) привязанный к ресурсу
    *
    * @param int $id Идентификатор ресурса
    *
    * @return Resource Найденный ресурс
    *
    */
    public function getThumbnail($id)
    {
      $queryBuilder = $this->createQueryBuilder('r')
      ->join($this->_entityName, 'r2')
      ->andWhere('r.id = :id')
      ->andWhere('r2.gid = r.gid')
      ->andWhere('r2.preset = 1')
      ->setParameter('id', $id);
      return $queryBuilder->getQuery()->getOneOrNullResult();
    }

    /**
    * Создает массив идентификаторов пресетов tumbnail(1) для ряда ресурсов
    *
    * @param int[] $ids Идентификаторы ресурсов, для которых необходимо найти пресеты
    *
    * @return mixed[] Найденный ресурс
    *
    */
    public function getThumbnailIds($ids)
    {
      $query = $this->getEntityManager()->createQuery(
        'SELECT r.id, r2.id as thumb_id
        FROM '.$this->_entityName.' r
        INNER JOIN '.$this->_entityName.' r2
        WHERE r.id IN ('.implode(',',$ids).')
        AND r2.gid = r.gid
        AND r2.preset = 1'
      );
      return $query->execute();
    }

    public function getByItemPriorityPreset($item,$priority,$preset){
      $ent = 'r';
      $unsorted = false;
      $index = 0;
      $queryBuilder = $this->createQueryBuilder($ent)
      ->andWhere('r.item = :i')
      ->setParameter('i', $item);
      if($preset != 0){
        $queryBuilder->join($this->_entityName, 'r2')
        ->andWhere('r2.id = r.gid')
        ->andWhere('r.preset = :prst')
        ->setParameter('prst',$preset);
        $ent = 'r2';
      }
      if($priority == 1){
        $queryBuilder->andWhere($ent.'.type = :t')
        ->setParameter('t',1);
      }else{
        $queryBuilder->andWhere($ent.'.type = :t')
        ->setParameter('t',2)
        ->andWhere($ent.'.priority = :p');
        if(!is_numeric($priority)){
          $queryBuilder->setParameter('p',0);
          $index = ltrim($priority, 'a');
          $usorted = true;
        }else{
          $queryBuilder->setParameter('p',$priority-1);
        }
      }
      $result = $queryBuilder->getQuery()->getResult();
      if(!isset($result[$index])){
        return NULL;
      }
      return $result[$index];
    }

    public function getByItemPriorityPresetOptimized($item,$priority,$preset){
      if($preset != 0){
        $type = 4;
        $join = 'INNER JOIN '.$this->_entityName.' r2';
        $joincond = 'AND r2.gid = r.gid';
        $ent = 'r2';
      }elseif($priority == 1){
        $type = 1;
        $join = '';
        $joincond = '';
        $ent = 'r';
      }else{
        $type = 2;
        $join = '';
        $joincond = '';
        $ent = 'r';
      }

      $sql =
      'SELECT r.src_filename as src_fn, r.path as filepath
      FROM '.$this->_entityName.' r
      '.$join.'
      WHERE r.item = '.$item.'
      '.$joincond.'
      AND '.$ent.'.type = '.$type.'
      AND '.$ent.'.priority = '.($priority-1).'
      AND r.preset = '.$preset;

      $query = $this->getEntityManager()->createQuery($sql);

      $result = $query->execute();
      if(!sizeof($result)){
        throw new \Exception(404);
      }
      return $result[0];
    }


    /**
    * Выполняет поиск ресурсов по ряду полей из формы
    *
    * @param ResourceQueryObject $queryObject Объект поиска
    * @see App\Entity\Search\ResourceQueryObject
    *
    * @return Resource[] Найденные ресурсы
    *
    */

      public function search(ResourceQueryObject $queryObject)
      {
        $startTime = microtime(true);
        $queryBuilder = $this->createQueryBuilder('r');
        if($queryObject->getField("item_query")->getField("name") != ""){
          $queryBuilder->innerJoin('r.item', 'i')
          ->andWhere('i.name LIKE :iname')
          ->setParameter('iname', '%'.$queryObject->getField("item_query")->getField("name").'%');
        }
        if($queryObject->getField("item_query")->getField("code") != ""){
          $allCodes = $queryObject->getField("item_query")->getField("code");
          $garbageCodes = [];
          $itemCodes = [];
          foreach($allCodes as $code){
            if(substr($code,0,1)==="9"){
              $garbageCodes[] = $code;
            }else{
              $itemCodes[] = $code;
            }
          }
          sizeof($itemCodes)&&$queryBuilder->innerJoin('r.item', 'ic');
          if(sizeof($itemCodes)===1){
            $queryBuilder->andWhere('ic.id LIKE :iccode')
            ->setParameter('iccode', '%'.$itemCodes[0]);
          }else{
            $codeCounter = 0;
            foreach($itemCodes as $code){
              $queryBuilder->orWhere('ic.id = :iccode'.++$codeCounter)
              ->setParameter('iccode'.$codeCounter, $code);
            }
          }
          $codeCounter = 0;
          $garbageCodeCounter = 0;
          foreach($garbageCodes as $code){
            $queryBuilder->orWhere('r.garbageNode = :gccode'.++$garbageCodeCounter)
            ->setParameter('gccode'.$garbageCodeCounter, $code);
          }
          $garbageCodeCounter = 0;
        }
        if(""!==$queryObject->getField("item_query")->getField("article")){
          $queryBuilder->innerJoin('r.item', 'ia');
          $queryBuilder
          ->orWhere('ia.article = :article')
          ->setParameter('article', $queryObject->getField("item_query")->getField("article"));
        }
        if($queryObject->getField("item_query")->getField("parent_name") != "" && $queryObject->getField("item_query")->getField("search_nested") == "false"){
          $queryBuilder->innerJoin('r.item', 'in')
          ->leftJoin('in.node', 'n')
          ->andWhere('n.name LIKE :nname')
          ->orWhere('n.id LIKE :ncode')
          ->setParameter('nname', '%'.$queryObject->getField("item_query")->getField("parent_name").'%')
          ->setParameter('ncode', '%'.$queryObject->getField("item_query")->getField("parent_name"));
        }
        if($queryObject->getField("item_query")->getField("parent_name") != "" && $queryObject->getField("item_query")->getField("search_nested") == "true"){
          $queryBuilder->innerJoin('r.item', 'parent')
          ->leftJoin('parent.node', 'parent1')
         ->leftJoin('parent1.parent', 'parent2')
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
         ->orderBy('parent.name', 'ASC')
         ->setParameter('pname', $queryObject->getField("item_query")->getField("parent_name").'%')
         ->setParameter('pcode', '%'.$queryObject->getField("item_query")->getField("parent_name"));
       }
       if($queryObject->getField("id") != ""){
         $queryBuilder->andWhere('r.id = :id')
         ->setParameter('id', $queryObject->getField("id"));
       }
       if($queryObject->getField("preset") != ""){
         $queryBuilder->andWhere('r.preset = :preset')
         ->setParameter('preset', $queryObject->getField("preset"));
       }
       if($queryObject->getField("type") != ""){
         $queryBuilder->innerJoin($this->_entityName, 'r2')
         ->andWhere('r2.id = r.gid')
         ->andWhere('r2.type = :type')
         ->setParameter('type', $queryObject->getField("type"));
       }
        //var_dump($queryBuilder->getDQL());
        //var_dump($queryObject);
        //var_dump($queryBuilder->setMaxResults(100)->getQuery());
        return $queryBuilder->setMaxResults(100)->getQuery()->getResult();

      }

      /**
       * Получает массив ресурсов товара с существующими пресетами для проверки существования необходимых картинок при запросе с сайта
       * @param  String $code Код 1с товара
       */
      public function getExistingResourcesOptimized($code)
      {

        $em = $this->getEntityManager();
        $connection = $em->getConnection();
        $db_name = $connection->getDatabase();
        $table_name = $em->getClassMetadata($this->_entityName)->getTableName();

        $sql = 'SELECT MIN(r.`gid`), GROUP_CONCAT(preset) presets, MIN(r.`type`) type, MAX(r.`priority`) priority FROM '.$db_name.'.'.$table_name.' r WHERE r.item_id = "'.$code.'" GROUP BY r.`gid`;';
        $query = $connection->prepare($sql);
        $query->execute();
        $response = $query->fetchAll();

        return $response;
      }

}
