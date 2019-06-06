<?php
/**
  * Сервис для работы с генерацией изображений
  */
namespace App\Service;

use Doctrine\ORM\EntityManagerInterface;
use App\Entity\Resource;
use App\Service\ResourceService;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\DependencyInjection\ContainerInterface;
use \Imagine\Imagick\Imagine;
use \Imagine\Image\Box;
use \Imagine\Image\ImageInterface;
use \Imagine\Filter\Advanced\Border;
use \Imagine\Image\Palette\Color\ColorInterface;
use \Imagine\Filter\Basic\Crop;
use \Imagine\Image\Point;
use \Imagine\Filter\Advanced\OnPixelBased;
use \Imagine\Filter\Advanced\Canvas;
use \Imagine\Filter\Basic\Thumbnail;
use \Imagine\Image\Palette\ColorParser;


/**
  * Сервис для работы с генерацией изображений
  */
class ImageProcessorService{

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
   * @param EntityManagerInterface $entityManager   Инструмент для работы с сущностями Doctrine ORM
   * @param ContainerInterface     $container       Сервис-контейнер Symfony
   * @param ResourceService        $resourceService Сервис для работы с сущностями типа Resource
   * @param Filesystem             $fileSystem      Сервис работы с файловой системой Symfony
   */
  public function __construct(EntityManagerInterface $entityManager, ContainerInterface $container, ResourceService $resourceService, Filesystem $fileSystem)
  {
    $this->entityManager = $entityManager;
    $this->container = $container;
    $this->resourceService = $resourceService;
    $this->fileSystem = $fileSystem;
  }

  /**
    * Запускает процесс генерации пресета для конкретного ресурса
    *
    * @param int $resourceId Идентификатор ресурса для обработки
    * @param int $presetId Идентификатор пресета
    *
    */
  public function processPreset($resourceId, $presetId)
  {

    $repository = $this->entityManager->getRepository(Resource::class);
    $resource = $repository->findOneBy(['id'=>$resourceId]);
    $processed = $repository->findBy(['gid'=>$resourceId, 'preset'=>$presetId]);

    if(sizeof($processed)==0){
      $this->_savePreset($resource,$presetId);
    }

    return true;
  }

  /**
    * Определяет параметры генерации изображения не по пресету, а с отдельно заданными шириной и высотой. В результате не создается новый ресурс.
    *
    * @param int $id Идентификатор ресурса для обработки
    * @param mixed[] $size_px Размер сгенерированного изображения в формате [ширина, высота]
    * @param string $targetPath Путь к конечному файлу
    *
    */
  public function processCustom($id, $size_px, $targetPath)
  {
      $resource = $this->entityManager->getRepository(Resource::class)->findOneBy([
        'id'=>$id
      ]);
      $size_px = explode('/', $size_px);
      $params = [
        'width'=>$size_px[0],
        'height'=>$size_px[1],
        'source'=>$this->container->getParameter('upload_directory').$resource->getPath(),
        'target'=>$targetPath,
        'mode'=>1
      ];
      $this->_generateImage($params);
  }

  /**
    * Определяет параметры генерации изображения по пресету и создания нового ресурса.
    *
    * @param Resource $resource Идентификатор ресурса для обработки
    * @param int $presetId Размер сгенерированного изображения в формате [ширина, высота]
    * @param mixed $createdOn Дата создания ресурса
    *
    */
  private function _savePreset($resource, $presetId, $createdOn = NULL)
  {
    $extension = $resource->getExtension();
    foreach($this->container->getParameter('presets') as $p){
      if($p['id'] == $presetId){
        $preset = $p;
      }
    }
    $processorDirectory = $this->container->getParameter('upload_directory').'/imgproc/';
    $targetPath = $processorDirectory.$resource->getId().'_'.$preset['name'].'.'.'jpeg';
    $this->_generateImage([
      'width'=>$preset['width'],
      'height'=>$preset['height'],
      'source'=>$this->container->getParameter('upload_directory').$resource->getPath(),
      'target'=>$targetPath,
      'mode'=>1
    ]);

    $parentEntityId = $resource->getItem()?$resource->getItem()->getId():$resource->getGarbageNode()->getId();
    $filename = $this->resourceService->getUniqueIdentifier(file_get_contents($targetPath), $parentEntityId,filesize($targetPath)).'.'.$extension;

    $resourceParameters = [
      'item_id' => $parentEntityId,
      'extension' => $extension,
      'path' => $targetPath,
      'username' => $resource->getUsername(),
      'filesize' => filesize($targetPath),
      'preset' => $preset['id'],
      'chunkPath' => $resource->getChunkPath(),
      'filename' => $filename,
      'src_filename' => $resource->getSrcFilename(),
      'gid' => $resource->getId(),
      'autogenerated'=>true,
      'type'=>4,
      'created_on'=>$createdOn
    ];

    $this->resourceService->processCompletedUpload($resourceParameters);
    $this->fileSystem->remove($targetPath);
  }


  /**
    * Создает изображение на основе существующего файла и входных параметров с помощью ImageMagick
    *
    * @param mixed[] $params Параметры генерации. Включают в себя путь к источнику, конечному файлу, размеру и режиму генерации
    *
    */
  private function _generateImage($params)
  {
    $imageProcessor = new Imagine();

    $processorDirectory = $this->container->getParameter('upload_directory').'/imgproc/';
    if(!$this->fileSystem->exists($processorDirectory)){$this->fileSystem->mkDir($processorDirectory);}
    if(!$this->fileSystem->exists(dirname($params['target']))){$this->fileSystem->mkDir(dirname($params['target']));}

    $image = $imageProcessor->open($params['source']);
    $image = $this->_convertToRGB($image);
    $image->save();
    $image = $this->_placeOnBackground($image,$imageProcessor);
    $imgSize = $this->_getImageDimentions($image);

    $targetSize = [(int)($params['width']),(int)($params['height'])];

    $imgRatio = round($imgSize[0]/$imgSize[1], 2);
    $targetRatio = round($targetSize[0]/$targetSize[1], 2);

    if($imgRatio !== $targetRatio){
      $retImg = $this->_thumbByContent($image, $imageProcessor, $targetSize, 5);
    }else{
      $retImg = $this->_getThumbnail($image, $targetSize, $params['mode']);
    }

    $retImg->save($params['target']);
  }

  private function _convertToRGB($image)
  {
    $palette = new \Imagine\Image\Palette\RGB();
    return $image->usePalette($palette);
  }

  private function _placeOnBackground($image,$imageProcessor,$start=[0,0],$size=null,$color=[255,255,255])
  {
    $imgSize = $size?$size:$this->_getImageDimentions($image);
    $palette = new \Imagine\Image\Palette\RGB();
    $background = new \Imagine\Image\Palette\Color\RGB($palette, $color, 100);
    $point = new Point($start[0], $start[1]);
    $box = new Box($imgSize[0], $imgSize[1]);
    $canvas = new Canvas($imageProcessor,$box, $point, $background);
    $image = $canvas->apply($image);
    return $image;
  }

private function _getThumbnail($image, $targetSize)
  {
    $size = new Box((int)($targetSize[0]), (int)($targetSize[1]));
    $thumb = new Thumbnail($size);
    $image = $thumb->apply($image);
    return $image;
  }

private function _isImageWhite($image)
{
  $white = true;
  $counter = 0;
  $step = 15;
  $onpixel = new OnPixelBased(function($i, $p) use (&$white, &$counter, $step) {
    if($counter%$step!=0){return;}
    $color = $i->getColorAt($p);
    if($color->__toString() !== '#ffffff'){
      $white = false;
    }
  });
  $onpixel->apply($image);
  return $white;
}

private function _cropMargin($image, $size, $returnMargin=false, $index=0)
{

  $tempImg = $image->copy();
  $imgSize = $this->_getImageDimentions($tempImg);
  $cropSize = $imgSize;

  if($imgSize[0]>$size[0]){
    $cropAxis = 0;
  }elseif($imgSize[1]>$size[1]){
    $cropAxis = 1;
  }

  $startCoords = [[0,0],[0,0]];
  $cropSize[$cropAxis] = (int)(($imgSize[$cropAxis]-$size[$cropAxis])/2);
  $startCoords[1][$cropAxis] = $imgSize[$cropAxis]-$cropSize[$cropAxis];
  if(!$returnMargin){
    $startCoords[0][$cropAxis] = $cropSize[$cropAxis];
    $cropSize[$cropAxis] = $size[$cropAxis];
  }

  $cropBox = new Box((int)($cropSize[0]), (int)($cropSize[1]));
  $start = new Point($startCoords[$index][0],$startCoords[$index][1]);
  $cropf = new Crop($start, $cropBox);

  return $cropf->apply($tempImg);
}

private function _areMarginsWhite($image, $targetSize)
{
  $margins = [$this->_cropMargin($image, $targetSize,true, 0), $this->_cropMargin($image, $targetSize,true, 1)];
  return $this->_isImageWhite($margins[0])&&$this->_isImageWhite($margins[1]);
}

private function _getImageDimentions($image)
{
  // $imagePath = $this->_getImagePath($image);
  // $imgSize = getimagesize($imagePath);
  // return [$imgSize[0],$imgSize[1]];
  $size = $image->getSize();
  return [$size->getWidth(),$size->getHeight()];
}

private function _getImagePath($image)
{
  $meta = $image->metadata()->toArray();
  $path = $meta['filepath'];
  return $path;
}

private function _fixRatio($image, $ratio, $interface)
{
  $imgSize = $this->_getImageDimentions($image);
  $targetSize = $imgSize;
  $currentRatio = $imgSize[0]/$imgSize[1];
  $fixAxis = (int)($ratio>$currentRatio);
  if($fixAxis===0){
    $targetSize[0] = (int)($imgSize[1]*$ratio);
  }elseif($fixAxis===1){
    $targetSize[1] = (int)($imgSize[0]/$ratio);
  }

  $marginsWhite = $this->_areMarginsWhite($image, $targetSize);
  if($marginsWhite){
    return $this->_cropMargin($image, $targetSize);
  }else{
    $targetSize = $imgSize;
    $fixAxis = $fixAxis===1?0:1;
    if($fixAxis===0){
      $targetSize[0] = (int)($imgSize[0]*($ratio/$currentRatio));
    }elseif($fixAxis===1){
      $targetSize[1] = (int)($imgSize[1]/($ratio/$currentRatio));
    }
    $placement = [0,0];
    $placement[$fixAxis] = round(($targetSize[$fixAxis] - $imgSize[$fixAxis])/2);
    return $this->_placeOnBackground($image, $interface, $placement, $targetSize);
  }
}

private function _getImageContentMap($image)
{

  $tempImg = $image->copy();

  $imgSize = $this->_getImageDimentions($image);

  $leftHit = $this->_scanBound([
    'start'=>[0,0],
    'direction'=>'right',
    'image'=>$image,
    'targetResult'=>true,
    'step'=>5
  ]);
  $topHit = $this->_scanBound([
    'start'=>[$leftHit[0],0],
    'direction'=>'down',
    'image'=>$image,
    'targetResult'=>true,
    'step'=>5
  ]);
  $rightHit = $this->_scanBound([
    'start'=>[$imgSize[0]-1,0],
    'direction'=>'left',
    'image'=>$image,
    'targetResult'=>true,
    'step'=>5
  ]);
  $bottomHit = $this->_scanBound([
    'start'=>[$leftHit[0],$imgSize[1]-1],
    'direction'=>'up',
    'image'=>$image,
    'targetResult'=>true,
    'step'=>5
  ]);
  return [
    'top'=>$topHit[1],
    'right'=>$rightHit[0],
    'bottom'=>$bottomHit[1],
    'left'=>$leftHit[0],
  ];
}

private function _thumbByContent($image, $interface, $targetSize, $margin = 5)
{
  $tempImg = $image->copy();
  $contentMap = $this->_getImageContentMap($tempImg);

  $cropStart = [$contentMap['left'], $contentMap['top']];
  $cropSize = [$contentMap['right']-$contentMap['left'], $contentMap['bottom']-$contentMap['top']];

  $cropBox = new Box((int)$cropSize[0], (int)$cropSize[1]);
  $start = new Point($cropStart[0],$cropStart[1]);
  $cropf = new Crop($start, $cropBox);

  $cropped = $cropf->apply($image);

  $marginx = 0;
  $marginy = 0;

  if(($cropSize[0]+$margin)>$targetSize[0] || ($cropSize[1]+$margin)>$targetSize[1]){
    $xdiff = ($cropSize[0]+$margin)-$targetSize[0];
    $ydiff = ($cropSize[1]+$margin)-$targetSize[1];
    $ratio = $cropSize[0]/$cropSize[1];
    if($xdiff>$ydiff){
      $targx = $targetSize[0]-$margin;
      $cropSize = [(int)$targx, (int)($targx/$ratio)-$margin];
      $marginx = $margin;
    }else{
      $targy = $targetSize[1]-$margin;
      $cropSize = [(int)($targy*$ratio)-$margin, (int)$targy];
      $marginy = $margin;
    }
    if($cropSize[0]>$targetSize[0]){
      $cropSize[0]=$targetSize[0];
    }
    if($cropSize[1]>$targetSize[1]){
      $cropSize[1]=$targetSize[1];
    }
    $size = new Box((int)($cropSize[0]), (int)($cropSize[1]));
    $thumb = new Thumbnail($size);
    $cropped = $thumb->apply($cropped);
    $cropSize = $this->_getImageDimentions($cropped);
  }

  $placement = [(int)floor(($targetSize[0]-$cropSize[0])/2+$marginx), (int)floor(($targetSize[1]-$cropSize[1])/2+$marginy)];
  return $this->_placeOnBackground($cropped, $interface, $placement, $targetSize);

}

private function _scanBound($params)
{

  $image = $params['image'];

  $imgSize = $this->_getImageDimentions($image);

  $x = (int)($params['start'][0]);
  $y = (int)($params['start'][1]);

  $step = $params['step'];

  if($params['direction'] === 'up' || $params['direction'] === 'down'){
    $axes = [&$y,&$x];
    $limits = [$params['direction']==='up'?0:$imgSize[1],$imgSize[0]];
    $increments = [$params['direction']==='up'?-$step:$step, $step];
    $resets = [$y,$x];
  }else{
    $axes = [&$x,&$y];
    $limits = [$params['direction']==='left'?0:$imgSize[0],$imgSize[1]];
    $increments = [$params['direction']==='left'?-$step:$step, $step];
    $resets = [$x,$y];
  }

  $result = !$params['targetResult'];
  $counters = [0,0];

  while(abs(($axes[0])-$limits[0])>$step && $result!==$params['targetResult']){
    $axes[1] = $resets[1];
    while(abs(($axes[1])-$limits[1])>$step && $result!==$params['targetResult']){

      $p = new Point((int)$x, (int)$y);

      $color = $image->getColorAt($p)->__toString();
      if(('#ffffff'!==$color)==$params['targetResult']){
        $result = $params['targetResult'];
      }else{
        $axes[1]+=$increments[1];
        $counters[1]++;
      }
    }
    if($result!==$params['targetResult']){
      $axes[0]+=$increments[0];
      $counters[0]++;
    }
  }
  return [$x, $y];
}

}
