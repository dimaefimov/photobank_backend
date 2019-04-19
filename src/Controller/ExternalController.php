<?php
/**
  * Контроллер для api внешних сайтов, использующих фотобанк
  *
  */
namespace App\Controller;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use \Symfony\Component\HttpKernel\Exception\HttpException;
use App\Entity\Resource;
use App\Service\ResourceService;
use App\Repository\ResourceRepository;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
  * Контроллер для api внешних сайтов, использующих фотобанк
  */
class ExternalController extends AbstractController
{

    /**
     * Отпраляет метаданных о ресурсах товаров каталога и созданных для них пресетах
     *
     * @param String _codes коды товаров каталога
     *
     * @Route("/resources/getmetadata/bulk/{_codes}",
     * methods={"GET"},
     * name="resources_bulk_get_metadata")
     */
    public function getBulkResourceMeta($_codes, ResourceService $resourceService)
    {
      $response = new JsonResponse();

      $codes = explode(',', $_codes);
      $metadata = $resourceService->getItemResourcesMetadata($codes);
      $response->setData($metadata);
      return $response;
    }

    /**
     * Отпраляет метаданных о ресурсах товара каталога и созданных для них пресетах
     *
     * @param String _code код товара каталога
     *
     * @Route("/resources/getmetadata/{_code}",
     * methods={"GET"},
     * name="resources_get_metadata")
     */
     public function searchResources($_code, ResourceService $resourceService)
     {
       $response = new JsonResponse();

       $metadata = $resourceService->getItemResourcesMetadata([$_code]);
       if(!isset($metadata[$_code])||sizeof($metadata[$_code])<1){
         throw new HttpException(404, "Не найдено ресурсов для товара");
       }
       $response->setData($metadata[$_code]);
       return $response;
     }

     /**
      * Получает по коду 1С и приоритету изображение ресурса, если указан jpg как формат, и нормализованный объект с информацией о ресурсе, если json
      *
      * @param string $_format Формат возвращаемого ресурса, подтягивется через wildcard {_format}
      * @param string $_priority Приоритет изображения в группе, 1 соответсвует основному, 2 и далее соотвествуют приоритету дополнительного изображения -1
      * @param string $_code Код 1С товара, подтягивается через wildcard {_code}
      * @param ResourceService $resourceService Сервис для работы с ресурсами
      *
      * @Route(
      *      "/getresource/{_code}_{_priority}_{_preset}.{_format}",
      *      methods={"GET"},
      *      name="catalogue_node_item_resource_by_priority_raw_optimized",
      *      requirements={
      *          "_code"="\d+",
      *          "_priority"="\d{1,100}",
      *          "_preset"="\d{1,3}",
      *          "_format": "jpg|json|bool"
      *      }
      * )
      */
     public function getResourceByPriorityRaw($_format, $_priority, $_preset, $_code, ResourceRepository $resRepo)
     {
         $fields = $resRepo->getByItemPriorityPresetOptimized($_code, $_priority, $_preset);
         $upload_directory = $this->getParameter('upload_directory');
         $fullFilePath = $upload_directory .'/'. $fields['filepath'];
         $src_filename = $fields['src_fn']?:'noName';
         if(!file_exists($fullFilePath)){throw new HttpException(503, "Ресурс временно недоступен");}
         return $this->file($fullFilePath, $src_filename, ResponseHeaderBag::DISPOSITION_INLINE);
     }

}
