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
  * Сервис для работы с генерацией изображений. Фасад для методов ImageMagick
  */
class ImageProcessorService
{

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

        if (sizeof($processed)==0) {
            $this->_savePreset($resource, $presetId);
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
    private function _savePreset($resource, $presetId, $createdOn = null)
    {
        $extension = $resource->getExtension();
        foreach ($this->container->getParameter('presets') as $p) {
            if ($p['id'] == $presetId) {
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

        $filename = $this->resourceService->getUniqueIdentifier(file_get_contents($targetPath), $parentEntityId, filesize($targetPath)).'.'.$extension;

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
        if (!$this->fileSystem->exists($processorDirectory)) {
            $this->fileSystem->mkDir($processorDirectory);
        }
        if (!$this->fileSystem->exists(dirname($params['target']))) {
            $this->fileSystem->mkDir(dirname($params['target']));
        }

        $image = $imageProcessor->open($params['source']);

        $layers = $image->layers();
        $layers->coalesce();
        $image = $layers->get(0);
        
        $image = $this->_convertToRGB($image);
        $image = $this->_placeOnBackground($image, $imageProcessor);

        $targetSize = [(int)($params['width']),(int)($params['height'])];

        $image = $this->_thumbByContent($image, $imageProcessor, $targetSize, 3);

        //$image = $this->_darken($image);

        $image->save($params['target']);
    }

    /**
     * Обрезает белые поля и вставляет контент на новое изображение нужного размера
     * @param  Imagine  $image         Объект изображения Imagick
     * @param  ImageInterface  $interface     Процессор Imagick
     * @param  Number[]  $targetSize    Размер конечного изображения
     * @param  integer $marginPercent Новый отступ в процентах от высоты изначального изображения
     *
     * @TODO Жирно, не читается, надо почистить
     */
    private function _thumbByContent($image, $interface, $targetSize, $marginPercent = 2)
    {
        $contentMap = $this->_getImageContentMap($image);
        $origSize = $this->_getImageDimentions($image);
        $marginPx = (int)floor(($marginPercent/100)*$origSize[1]);

        // Кто загружает белые фотки вообще?
        if($contentMap['right']<=$contentMap['left']||$contentMap['bottom']<=$contentMap['top']){
          $cropStart = [0,0];
          $cropSize = $origSize;
        }else{
          $cropStart = [$contentMap['left'], $contentMap['top']];
          $this->_clampVector($cropStart,[0,0],$origSize);
          $cropSize = [$contentMap['right']-$contentMap['left'], $contentMap['bottom']-$contentMap['top']];
          $this->_clampVector($cropSize,[0,0],$origSize);
        }

        $image = $this->_cropImage($image,$cropSize,$cropStart);

        $insertSize = array_map(function($axis)use($marginPx){
          return $axis+(2*$marginPx);
        },$cropSize);

        $image = $this->_placeOnBackground($image, $interface, [$marginPx,$marginPx], $insertSize);

        $imgSize = $this->_getImageDimentions($image);

        if ($insertSize[0]>$targetSize[0] || $insertSize[1]>$targetSize[1]) {

            $xdiff = $insertSize[0]-$targetSize[0];
            $ydiff = $insertSize[1]-$targetSize[1];
            $ratio = $insertSize[0]/$insertSize[1];

            $thumbSize = [];

            if ($xdiff>$ydiff) {
                $targx = $targetSize[0];
                $thumbSize = [(int)$targx, (int)($targx/$ratio)];
            } else {
                $targy = $targetSize[1];
                $thumbSize = [(int)($targy*$ratio), (int)$targy];
            }

            $this->_clampVector($thumbSize,[0,0],$targetSize);

            $size = new Box((int)($thumbSize[0]), (int)($thumbSize[1]));
            $thumb = new Thumbnail($size);
            $image = $thumb->apply($image);
            unset($size);unset($thumb);

            $insertSize = $this->_getImageDimentions($image);
        }

        $placement = [(int)floor(($targetSize[0]-$insertSize[0])/2), (int)floor(($targetSize[1]-$insertSize[1])/2)];
        $image = $this->_placeOnBackground($image, $interface, $placement, $targetSize);
        return $image;
    }

    private function _placeOnBackground($image, $imageProcessor, $start=[0,0], $size=null, $color=[255,255,255])
    {
        $imgSize = $size?$size:$this->_getImageDimentions($image);
        $palette = new \Imagine\Image\Palette\RGB();
        $background = new \Imagine\Image\Palette\Color\RGB($palette, $color, 100);
        $point = new Point($start[0], $start[1]);
        $box = new Box($imgSize[0], $imgSize[1]);
        $canvas = new Canvas($imageProcessor, $box, $point, $background);
        $image = $canvas->apply($image);
        unset($palette);unset($background);
        unset($point);unset($box);
        return $image;
    }

    private function _darken($image)
    {
      $dims = $this->_getImageDimentions($image);

      $palette = new \Imagine\Image\Palette\RGB();
      $targarr = [244,244,244];
      $targarrmutlvals = [$this->_mapToUnit($targarr[0]),$this->_mapToUnit($targarr[1]),$this->_mapToUnit($targarr[2])];
      $fullcol = new \Imagine\Image\Palette\Color\RGB($palette, $targarr, 100);

      for($w = 1; $w<$dims[0]; $w++){
        for($h = 1; $h<$dims[1]; $h++){
          $point = new Point($w,$h);
          $pixcol = $image->getColorAt($point);
          if($pixcol->__toString()=='#ffffff'){
            $image->draw()->dot($point, $fullcol);
            continue;
          }
          $colarr = [$pixcol->getRed(),$pixcol->getGreen(),$pixcol->getBlue()];
          $colarr = [$this->_mapToUnit($colarr[0]),$this->_mapToUnit($colarr[1]),$this->_mapToUnit($colarr[2])];
          $retcol = [];
          for($i = 0; $i<3; $i++){
            $retcol[] = (int)($colarr[$i]*$targarrmutlvals[$i]*255);
          }
          $image->draw()->dot($point, new \Imagine\Image\Palette\Color\RGB($palette, $retcol, 100));
        }
      }

      return $image;
    }

    private function _convertToRGB($image)
    {
        $palette = new \Imagine\Image\Palette\RGB();
        return $image->usePalette($palette);
    }

    private function _getThumbnail($image, $targetSize)
    {
        $size = new Box((int)($targetSize[0]), (int)($targetSize[1]));
        $thumb = new Thumbnail($size);
        $image = $thumb->apply($image);

        unset($size);
        unset($thumb);

        return $image;
    }

    private function _getImageDimentions($image)
    {
        $size = $image->getSize();
        return [$size->getWidth(),$size->getHeight()];
    }

    private function _cropImage($image, $cropSize, $cropStart)
    {
      $cropBox = new Box((int)$cropSize[0], (int)$cropSize[1]);
      $start = new Point($cropStart[0], $cropStart[1]);
      $cropf = new Crop($start, $cropBox);

      $image = $cropf->apply($image);

      unset($cropBox);
      unset($start);
      unset($cropf);

      return $image;
    }

      /**
       * Получает координаты начала контента в изображении, иными словами места, в которых заканчиваются белые поля
       */
      private function _getImageContentMap($image)
      {
        $imgSize = $this->_getImageDimentions($image);
        $step = ceil($imgSize[0]/500);
        $leftHit = $this->_scanBound([
         'start'=>[0,0],
         'direction'=>'right',
         'image'=>$image,
         'targetResult'=>true,
         'step'=>$step
        ]);
        $topHit = $this->_scanBound([
          'start'=>[$leftHit[0],0],
          'direction'=>'down',
          'image'=>$image,
          'targetResult'=>true,
          'step'=>$step
        ]);
        $rightHit = $this->_scanBound([
          'start'=>[$imgSize[0]-1,0],
          'direction'=>'left',
          'image'=>$image,
          'targetResult'=>true,
          'step'=>$step
        ]);
        $bottomHit = $this->_scanBound([
          'start'=>[$leftHit[0],$imgSize[1]-1],
          'direction'=>'up',
          'image'=>$image,
          'targetResult'=>true,
          'step'=>$step
        ]);
        return [
        'top'=>$topHit[1],
        'right'=>$rightHit[0],
        'bottom'=>$bottomHit[1],
        'left'=>$leftHit[0],
      ];
    }
  

    private function _scanBound($params)
    {
        $image = $params['image'];

        $imgSize = $this->_getImageDimentions($image);

        $x = (int)($params['start'][0]);
        $y = (int)($params['start'][1]);

        $step = $params['step'];

        if ($params['direction'] === 'up' || $params['direction'] === 'down') {
            $axes = [&$y,&$x];
            $limits = [$params['direction']==='up'?0:$imgSize[1],$imgSize[0]];
            $increments = [$params['direction']==='up'?-$step:$step, $step];
            $resets = [$y,$x];
        } else {
            $axes = [&$x,&$y];
            $limits = [$params['direction']==='left'?0:$imgSize[0],$imgSize[1]];
            $increments = [$params['direction']==='left'?-$step:$step, $step];
            $resets = [$x,$y];
        }

        $result = !$params['targetResult'];
        $counters = [0,0];

        while (abs(($axes[0])-$limits[0])>$step && $result!==$params['targetResult']) {
            $axes[1] = $resets[1];
            while (abs(($axes[1])-$limits[1])>$step && $result!==$params['targetResult']) {
                $p = new Point((int)$x, (int)$y);

                $color = $image->getColorAt($p)->__toString();
                if (('#ffffff'!==$color)==$params['targetResult']) {
                    $axes[1]-=$increments[1];
                    $result = $params['targetResult'];
                } else {
                    $axes[1]+=$increments[1];
                    $counters[1]++;
                }
            }
            if ($result!==$params['targetResult']) {
                $axes[0]+=$increments[0];
                $counters[0]++;
            } else {
                $axes[0]-=$increments[0];
                $counters[0]++;
            }
            $this->_clampVector($axes,[0,0],$imgSize);
        }
        return [$x, $y];
    }

    /**
     * Ограничивает вектор (точку начала/размер итд) минисальнми и максимальным значением.
     * Важно: обрабатывает аргумент как референс, а возвращает разницу
     */
    private function _clampVector(&$vec, $min, $max)
    {
      $overScan = array_fill(0,sizeof($vec),['max'=>0,'min'=>0]);
      for($i = 0; $i<sizeof($vec); $i++){
        $maxOverScan = $max[$i]-$vec[$i];
        $minOverScan = $vec[$i]-$min[$i];
        if($maxOverScan<0){
          $vec[$i] = $max[$i];
          $overScan[$i]['max'] = abs($maxOverScan);
        }
        if($minOverScan<0){
          $vec[$i] = $min[$i];
          $overScan[$i]['min'] = abs($minOverScan);
        }
      }
      return $overScan;
    }

    private function _mapToUnit($num, $min = 0, $max = 255)
    {
      if($num>$max){
        return 1;
      }
      if($num<$min){
        return 0;
      }
      return ($num-$min)/($max-$min);
    }
}