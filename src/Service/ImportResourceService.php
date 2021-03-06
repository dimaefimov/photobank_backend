<?php
/**
  * Скрипт для bulk-импорта ресурсов из файловой системы. Ожидает директорию с файлами, названия которых соответствуют
  * паттерну 00000000000_0.jpg, так как в этом виде данные были предоставлены при первоначальном импорте. Нежелательно использовать этот сервис в будущем, он предназначался как хак на один раз
  */
namespace App\Service;

use Doctrine\ORM\EntityManagerInterface;
use App\Entity\Resource;
use App\Entity\CatalogueNodeItem;
use App\Service\ResourceService;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Finder\Finder;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
  * Скрипт для bulk-импорта ресурсов из файловой системы. Ожидает директорию с файлами, названия которых соответствуют
  * паттерну 00000000000_0.jpg, так как в этом виде данные были предоставлены при первоначальном импорте. Нежелательно использовать этот сервис в будущем, он предназначался как хак на один раз
  */
class ImportResourceService{

  /**
  * Инструмент работы с сущностями Doctrine ORM
  */
private $entityManager;
  /**
  * Сервис-контейнер Symfony
  */
private $container;
/**
 * Сервис для работы с сущностями типа Resource
 */
  private $resourceService;
  /**
  * Сервис работы с файловой системой Symfony
  */
private $fileSystem;

  /**
   * Конструктор класса
   * @param EntityManagerInterface $entityManager   Инструмент работы с сущностями Doctrine ORM
   * @param ContainerInterface     $container       Сервис-контейнер Symfony
   * @param ResourceService        $resourceService  Сервис для работы с сущностями типа Resource
   * @param Filesystem             $fileSystem      Сервис работы с файловой системой Symfony
   */
  public function __construct(EntityManagerInterface $entityManager, ContainerInterface $container, ResourceService $resourceService, Filesystem $fileSystem){
    $this->entityManager = $entityManager;
    $this->container = $container;
    $this->resourceService = $resourceService;
    $this->fileSystem = $fileSystem;
  }

  /**
   * Выполняет импорт ресурсов.
   */
  public function import(){

    $resRepo = $this->entityManager->getRepository(Resource::class);
    $itemRepo = $this->entityManager->getRepository(CatalogueNodeItem::class);

    $finder = new Finder();
    $finder->files()->in("%kernel.project_dir%/private/uploads/");

    set_time_limit(0);

    $username = "user";
    $preset = 0;
    $resid = 0;
    $type = 3;
    $chunk_path = " ";
    $created_on = date('d-m-Y H:i:s');
    $isdefault = 0;
    $isdeleted = 0;
    $autogenerated = 0;
    $comment = "";

    foreach($finder as $file){
      $priority = 0;
      $is1c = 0;
      $filepath = $file->getRelativePath();
      $fileRelativePathName = $file->getRelativePathName();
      $fileName = end(explode("/",$fileRelativePathName));
      $noext = explode(".",$filesName)[0];
      $extension = explode(".",$fileName)[1];
      $filenamearr = explode("_", $noext);
      $code = $filenamearr[0];
      $code = ltrim($code, '0');

      $allowedFiletypes = ['jpg', 'jpeg'];
      if(!in_array($extension, $allowedFiletypes)){
        continue;
      }
      if(sizeof($filenamearr)==2){
        $priority = $filenamearr[1];
        $is1c = true;
      }else{
        $priority = 0;
        $is1c = 0;
      }

      $item = $itemRepo->findOneBy([
        "item_code"=>$code
      ]);

      $itemid = $item->getId();
      $code = $item->getId();
      $sizebytes = filesize($filepath);
      $filehash = $this->resourceService->getUniqueIdentifier(file_get_contents($filepath),$code,$filesize);
      $dirname = $this->container->getParameter('fileuploader.uploaddirectory').$this->resourceService->generatePath($code);
      $path = $dirname.$filehash.".".$extension;
      $filename = $filehash.".".$extension;
      $srcfilename = $files[$i];
      $sizepx = getimagesize($filepath);
      $sizepx = $sizepx[0].'/'.$sizepx[1];

      $this->fileSystem->mkdir($dirname, 0777, true);
      $this->fileSystem->appendToFile($path,file_get_contents($this->uploadParams['tempchunkdir'].'/'.$this->uploadParams['filename'].'.part'.$i));

      $responseParams=array(
        'path'=>$path,
        'chunkPath'=>"",
        'filename'=>$filename,
        'src_filename'=>$srcfilename,
        'filesize'=>$filesize,
        'extension'=>$extension,
        'username'=>"system",
        'item_id'=>$itemid,
        'preset'=>0,
        'type'=>3,
        'total_chunks'=> 0,
        'gid'=>NULL,
        'autogenerated'=>false
      );

      $this->resourceService->processCompletedUpload($responseParams);

    }

  }

}
