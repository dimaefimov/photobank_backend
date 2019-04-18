<?php
/**
  * Контроллер для получения и обновления информации о сущностях каталога CatalogueNode, CatalogueNodeItem, Resource
  *
  */
namespace App\Controller;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\ParamConverter;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Form\Form;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use \Symfony\Component\HttpKernel\Exception\HttpException;

// use Symfony\Component\Serializer\SerializerInterface; // use AppSerializer instead
use App\Serializer\AppSerializer;
use Symfony\Component\Serializer\Normalizer\ObjectNormalizer;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use App\Entity\CatalogueNode;
use App\Entity\CatalogueNodeItem;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

use Symfony\Component\Messenger\MessageBusInterface;

use App\Service\Search\SearchQueryBuilder;
use App\Service\Search\SearchService;

/**
  * Контроллер для получения и обновления информации о сущностях каталога CatalogueNode, CatalogueNodeItem, Resource
  */
class CatalogueController extends AbstractController
{

    /**
     * Получает нормализованный объект с информацией о разделе каталога
     *
     * @param CatalogueNode $cnode Обьект раздела, подтягивается через wildcard {id}
     * @param AppSerializer $serializer Сериализатор для приведения к стандарту возвращаемого объекта
     *
     * @Route("/catalogue/node/{id}",
     * methods={"GET"},
     * name="catalogue_node")
     */
    public function getNode(CatalogueNode $cnode, AppSerializer $serializer)
    {
        $response = new JsonResponse();

        $cnodeArray = $serializer->normalize($cnode, null, array(
            'add-relation' => false
        ));

        $response->setData($cnodeArray);
        return $response;
    }
    /**
     * Получает нормализованный объект с информацией о дочерних разделах каталога
     *
     * @param int $id Идентификатор раздела каталога, подтягивается через wildcard {id}
     * @param CatalogueNode $cnode Обьект раздела, подтягивается через wildcard {id}
     * @param AppSerializer $serializer Сериализатор для приведения к стандарту возвращаемого объекта
     *
     * @Route("/catalogue/nodes/{id}",
     * methods={"GET"},
     * name="catalogue_nodes",
     * defaults={"id" = null})
     */
    public function getNodes($id, CatalogueNode $cnode = null, AppSerializer $serializer)
    {

        if (!is_null($id) && !$cnode) {
            throw $this->createNotFoundException(
                'Не найдено категории с идентификатором = '.$id
            );
        }

        $response = new JsonResponse();


        $em = $this->getDoctrine()->getManager();
        $repo = $em->getRepository(CatalogueNode::class);

        if(!$cnode){
            $children = $repo->findBy([
                'parent' => null,
            ],[
              'name'=>'ASC'
            ]);
        }else{
            // $children = $cnode->getChildren();
            $children = $repo->findBy([
                'parent' => $cnode->getId(),
            ],[
              'name'=>'ASC'
            ]);
        }
        $cnodeArray = $serializer->normalize($children, null, array(
            'add-relation' => false,
            'add-item-count' => true
        ));

        $response->setData($cnodeArray);
        return $response;
    }
    /**
     * Получает нормализованный объект с информацией о товаре по коду 1С
     *
     * @param CatalogueNodeItem $citem Объект товара, подтягивается через wildcard {id}
     * @param AppSerializer $serializer Сериализатор для приведения к стандарту возвращаемого объекта
     *
     * @Route("/catalogue/node/item/{item}",
     * requirements={"item" = "\d{11}"},
     * methods={"GET"},
     * name="catalogue_node_item_by_itemcode")
     * @ParamConverter("citem", class="App\Entity\CatalogueNodeItem", options={"mapping": {"item": "id"}})
     */
    public function getItemByItemCode(CatalogueNodeItem $citem, AppSerializer $serializer)
    {
        $response = new JsonResponse();

        $citemArray = $serializer->normalize($citem, null, array(
          'add-children'=>true,
            ObjectNormalizer::ENABLE_MAX_DEPTH => true,
            'groups' => array('main','parent')
        ));

        $response->setData($citemArray);

        return $response;
    }

    /**
     * Получает нормализованный объект с информацией о товаре
     *
     * @param CatalogueNodeItem $citem Объект товара, подтягивается через wildcard {id}
     * @param AppSerializer $serializer Сериализатор для приведения к стандарту возвращаемого объекта
     *
     * @Route("/catalogue/node/item/{id}",
     * methods={"GET"},
     * name="catalogue_node_item")
     */
    public function getItem(CatalogueNodeItem $citem, AppSerializer $serializer)
    {
        $response = new JsonResponse();

        $citemArray = $serializer->normalize($citem, null, array(
          'add-children'=>true,
            ObjectNormalizer::ENABLE_MAX_DEPTH => true,
            'groups' => array('main','parent')
        ));

        $response->setData($citemArray);
        return $response;
    }

    /**
     * Получает нормализованный объект с информацией о дочерних товарах от раздела каталога
     *
     * @param CatalogueNode $cnode Обьект раздела, подтягивается через wildcard {id}
     * @param AppSerializer $serializer Сериализатор для приведения к стандарту возвращаемого объекта
     *
     * @Route("/catalogue/node/items/{id}",
     * methods={"GET"},
     * name="catalogue_node_items")
     */
    public function getItems(CatalogueNode $cnode, AppSerializer $serializer)
    {
        $response = new JsonResponse();

        $items = $cnode->getItems();
        $itemsArray = $serializer->normalize($items, null, array(
          'add-children-count'=>true,
            ObjectNormalizer::ENABLE_MAX_DEPTH => true,
            'groups' => array('main')
        ));

        $response->setData($itemsArray);
        return $response;
    }

    /**
     * Осуществляет поиск среди товаров
     *
     * @param Request $request Объект актуального запроса
     * @param SearchQueryBuilder $queryBuilder Сервис создания поискового объекта
     * @param SearchService $searchService Сервис, осуществляющий поиск через репозиторий
     * @param AppSerializer $serializer Сериализатор для приведения к стандарту возвращаемого объекта
     *
     * @Route("/catalogue/search/items",
     * methods={"GET"},
     * name="catalogue_search_items")
     */
    public function searchItems(Request $request, SearchQueryBuilder $queryBuilder, SearchService $searchService,AppSerializer $serializer)
    {
      $response = new JsonResponse();
      $queryObject = $queryBuilder->makeItemQuery($request);
      $items = $searchService->search($queryObject);
      $itemsArray = $serializer->normalize($items, null, array(
        'add-children-count'=>true,
          ObjectNormalizer::ENABLE_MAX_DEPTH => true,
          'groups' => array('main')
      ));
      $response->setData($itemsArray);
      return $response;
    }

}
