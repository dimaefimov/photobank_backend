<?php

namespace App\PhotoBank\FileUploaderBundle\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use App\PhotoBank\FileUploaderBundle\Event\FileUploadedEvent;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\Resource;
use App\Entity\CatalogueNodeItem;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Translation\TranslatorInterface;
use App\PhotoBank\FileUploaderBundle\Service\UploadRecordManager;

class FileUploaderSubscriber implements EventSubscriberInterface
{

  private $entityManager;
  private $recordManager;

  public function __construct(
      EntityManagerInterface $entityManager,
      UploadRecordManager $recordManager,
      TranslatorInterface $translator)
  {
    $this->entityManager = $entityManager;
    $this->recordManager = $recordManager;
    $this->translator = $translator;
  }
  public static function getSubscribedEvents()
  {
    return array(
     'fileuploader.uploaded' => array('processUpload',0),
     'fileuploader.chunkwritten' => array('processChunkWrite',0),
    );
  }
  public function processUpload(FileUploadedEvent $event)
  {
    $resource = new Resource();

    $repository = $this->entityManager->getRepository(CatalogueNodeItem::class);
    $item_id = $event->getParams()['item_id'];
    $item_code = $event->getParams()['item_code'];
    $item = $repository->findOneBy( ['itemCode' => $item_code] );
    if (!$item) {
        $error_string = $this->translator->trans("Product not founded",[],'file_uploader') . '. '. $this->translator->trans("The code is:",[],'file_uploader') . ' ' . $item_code ;
        throw new NotFoundHttpException($error_string);
    }

    $resource->setPath($event->getParams()['path']);
    $resource->setUsername($event->getParams()['username']);
    $resource->setItem($item);
    $resource->setPreset($event->getParams()['preset']);
    $resource->setType($event->getParams()['type']);
    $resource->setChunkPath($event->getParams()['chunkPath']);
    $resource->setFilename($event->getParams()['filename']);
    $resource->setSrcFilename($event->getParams()['src_filename']);
    $resource->setCreatedOn(date('d-m-Y H:i:s'));

    $this->entityManager->persist($resource);
    $this->entityManager->flush($resource);
  }

  public function processChunkWrite($event){
    $this->recordManager->update($event);
  }
}
