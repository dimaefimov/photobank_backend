<?php
/**
  * Сервис для создания, обновления, удаления и получения информации по объектам типа "Resource"
  */
namespace App\Service;
use Symfony\Component\Translation\TranslatorInterface;
use Doctrine\ORM\EntityManagerInterface;
use PhotoBank\FileUploaderBundle\Event\FileUploadedEvent;
use App\Entity\Resource;
use App\Entity\CatalogueNodeItem;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use App\Service\ResourceService;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\DependencyInjection\ContainerInterface;

use Symfony\Component\Messenger\MessageBusInterface;
use App\Message\ResourcePresetNotification;
use App\Exception\ItemNotFoundException;
/**
  * Сервис для создания, обновления, удаления и получения информации по объектам типа "Resource"
  */
class ResourceService{

  /**
  * Инструмент работы с сущностями Doctrine ORM
  */
  private $entityManager;
  /**
  * Сервис перевода
  */
  private $translator;
  /**
  * Сервис работы с файловой системой Symfony
  */
  private $fileSystem;
  /**
  * Сервис-контейнер Symfony
  */
  private $container;
  /**
  * Сервис работы с компонентом messenger
  */
  private $messageBus;
  /**
  * Сервис работы с записями о загрузках
  */
  private $recordManager;

/**
 * Конструктор класса
 * @param EntityManagerInterface $entityManager Инструмент работы с сущностями Doctrine ORM
 * @param TranslatorInterface    $translator    Сервис перевода
 * @param Filesystem             $fileSystem    Сервис работы с файловой системой Symfony
 * @param ContainerInterface     $container     Сервис-контейнер Symfony
 * @param MessageBusInterface    $messageBus    Сервис работы с компонентом messenger
 */
  public function __construct(
      EntityManagerInterface $entityManager,
      TranslatorInterface $translator,
      Filesystem $fileSystem,
      ContainerInterface $container,
      MessageBusInterface $messageBus)
  {
    $this->entityManager = $entityManager;
    $this->translator = $translator;
    $this->fileSystem = $fileSystem;
    $this->container = $container;
    $this->messageBus = $messageBus;
  }

/**
 * Разбивает код 1C товара на 2-значниые названия директорий с разделителем /
 * @param string $item_code 1С код товара
 */
  public function generatePath($item_code)
  {
    $splitId = array();
    for($i=0; $i<strlen($item_code)/2; $i++){
      $splitId[] = substr($item_code, $i*2, 2);
    }
    $splitIdPath = implode('/',$splitId).("/");

    return $splitIdPath;
  }

/**
 * Обрабатывает успешно законченную загрузку файла
 * @param mixed[] $resourceParameters Параметры загруженного файла
 */
  public function processCompletedUpload($resourceParameters)
  {
    $filepath = $resourceParameters['path'];
    $item_code = $resourceParameters['item_id'];
    $destinationPath = '/'.$this->generatePath($item_code).$resourceParameters['filename'];
    $destinationDir = $this->container->getParameter('fileuploader.uploaddirectory').'/'.$this->generatePath($item_code).$resourceParameters['filename'];
    $this->fileSystem->copy($filepath, $destinationDir);
    $resourceParameters['path'] = $destinationPath;
    $resourceEntity = $this->persistResource($resourceParameters);
    if($resourceEntity->getType() != NULL){
      $this->dispatchPresetMessages($resourceEntity->getId(), $resourceEntity->getType());
    }
  }

/**
 * Созраняет запись о ресурсе в базе данных
 * @param mixed[] $resourceParameters Параметры загруженного файла
 *
 */
  public function persistResource($resourceParameters)
  {
    $resource = new Resource();
    $repository = $this->entityManager->getRepository(CatalogueNodeItem::class);
    $item_id = $resourceParameters['item_id'];
    $item = $repository->findOneBy( ['id' => $item_id] );
    if (!$item) {
        $error_string = $this->translator->trans("Product not founded",[],'file_uploader') . '. '. $this->translator->trans("The code is:",[],'file_uploader') . ' ' . $item_id ;
        throw new ItemNotFoundException($error_string);
    }

    if(in_array(strtolower($resourceParameters['extension']),array('jpg','jpeg','png','gif','psd','tiff','tif','bmp'))){
      $filesizepx = getimagesize($this->container->getParameter("upload_directory").$resourceParameters['path']);
      $resource->setSizePx($filesizepx[0].'/'.$filesizepx[1]);
    }

    $resource->setPath($resourceParameters['path']);
    $resource->setUsername($resourceParameters['username']);
    $resource->setItem($item);
    $resource->setExtension($resourceParameters['extension']);
    $resource->setSizeBytes($resourceParameters['filesize']);
    $resource->setPreset($resourceParameters['preset']);
    $resource->setChunkPath($resourceParameters['chunkPath']);
    $resource->setFilename($resourceParameters['filename']);
    $resource->setSrcFilename($resourceParameters['src_filename']);
    if(!array_key_exists('created_on', $resourceParameters) || $resourceParameters['created_on'] == NULL){
      $resource->setCreatedOn(date('d-m-Y H:i:s'));
    } else { $resource->setCreatedOn($resourceParameters['created_on']); }
    $resource->setAutogenerated($resourceParameters['autogenerated']);
    if(!array_key_exists('type', $resourceParameters) || $resourceParameters['type'] != NULL){
      $resource->setType($resourceParameters['type']);
    }
    if(!array_key_exists('gid', $resourceParameters) || $resourceParameters['gid'] != NULL){
      $resource->setGid($resourceParameters['gid']);
    }

    $this->entityManager->persist($resource);
    $this->entityManager->flush($resource);

    return $resource;
  }

/**
 * Обновляет запись о ресурсе
 * @param Resource $resource Ресурс, который нужно обновить
 * @param  mixed[] $data     Новые данные для ресурса [ключ=>значение]
 */
  public function patchResource($resource, $data)
  {
    //Validation for limited resource types
    $maxMain = $this->container->getParameter('max_main_resources');
    $maxAdd = $this->container->getParameter('max_additional_resources');
    $currMain = sizeof($this->entityManager->getRepository(Resource::class)->findBy(['type'=>1, 'gid'=>$resource->getGid()]));
    $currAdd = sizeof($this->entityManager->getRepository(Resource::class)->findBy(['type'=>2, 'gid'=>$resource->getGid()]));
    if(($maxMain==$currMain && $data['type']==1)||($maxAdd==$currAdd && $data['type']==2)){
      return false;
    }

    $priority = $data['priority']??$resource->getPriority();
    $resource->setPriority(intval($priority));

    $type = $data['type']??$resource->getType();
    $resource->setType(intval($type));

    $Is1c = $data['1c']??$resource->getIs1c();
    $resource->setIs1c(intval($Is1c));

    $IsDeleted = $data['deleted']??$resource->getIsDeleted();
    $resource->setIsDeleted(intval($IsDeleted));

    $IsDefault = $data['default']??$resource->getIsDefault();
    $resource->setIsDefault(intval($IsDefault));

    $this->entityManager->flush($resource);
    return true;
  }

  /**
   * Создает md5-hash для ресурса, который станет названием файла в конечной файловой системе
   * @param  string $file     Контент файла
   * @param  int $itemId   Идентификатор товара
   * @param  int $filesize Размер файла в байтах
   * @return string $identifier Сгенерированный идентификатор
   */
  public function getUniqueIdentifier($file, $itemId, $filesize)
  {
    $fileHash = crc32($file);
    $identifier = md5($fileHash.$itemId.$filesize);
    return $identifier;
  }

/**
 * Отправляет сообщения о необходимости создать все пресеты, которые подразумевает тип ресурса
 * @param Resource $resource Ресурс, для которого необходимо сгенерировть пресеты
 * @param int $type Тип ресурса
 */
  public function dispatchPresetMessages($resource, $type)
  {
    $presetCollections = $this->container->getParameter('preset_collections');
    $presetCollection = array();
    foreach($presetCollections as $collection){
      if($collection['id'] == $type){
        $presetCollection = $collection['presets'];
      }
    }
    foreach($presetCollection as $preset){
      $presetData = [
        'resourceId'=>$resource,
        'presetId'=>$preset,
        'createdOn'=>date('d-m-Y H:i:s')
      ];
      $this->messageBus->dispatch(new ResourcePresetNotification($presetData));
    }
  }

/**
 * Получает инфомацию о ресурсе по его id
 * @param  int $id Идентификатор ресурса
 * @return mixed[] $returnParams Возвращаемая информация о ресурсе
 *
 * TODO возвращать нормализованный объект
 */
  public function getResourceInfo($id)
  {
    $returnParams = [
      'path'=>'',
      'size_px'=>'',
      'size_bytes'=>'',
    ];
    $resource = $this->entityManager->getRepository(Resource::class)->findOneBy([
      'id'=>$id
    ]);
    $returnParams['path'] = $resource->getPath();
    $returnParams['size_px'] = $resource->getSizePx();
    $returnParams['size_bytes'] = $resource->getSizeBytes();
    return $returnParams;
  }


  /**
   * Получает ресурс по товару, к которому он привязан и приоритету. Приоритет будет соответствовать проиритету в базе данных -1 при значении отличном от 1. При запросе с приоритетом 1 вернется основное изображение
   * @param  int  $itemId  Идентификатор товара
   * @param  integer $priority Приоритет ресурса
   * @return Resource $resource Найденный ресурс
   */
  public function getByItemAndPriority($itemId, $priority = 1)
  {
    $repo = $this->entityManager->getRepository(Resource::class);
    if($priority == 1){
      $findParams = [
        'item'=>$itemId,
        'type'=>1
      ];
    }else{
      $findParams = [
        'item'=>$itemId,
        'type'=>2,
        'priority'=>$priority-1
      ];
    }
    $resource = $repo->findOneBy($findParams);
    return $resource;
  }

  public function getOriginal($item)
  {
    $resources = $this->entityManager->getRepository(Resource::class)->findOriginalResources($item);
    return $resources;
  }

}
