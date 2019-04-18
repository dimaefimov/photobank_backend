<?php
/**
 * Нормализатор для вывода данных о товарах каталога
 */
namespace App\Serializer\Normalizer;

use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Serializer\Normalizer\CustomNormalizer;

use App\Entity\Resource;
use App\Entity\CatalogueNodeItem;
/**
 * Нормализатор для вывода данных о товарах каталога
 */
class CatalogueNodeItemNormalizer extends CustomNormalizer implements NormalizerInterface
{
    /**
     * {@inheritdoc}
     *
     * @param CatalogueNodeItem $object Объект, который нужно нормализовать
     * @param  string $format  Формат, в котором будет получен ответ
     * @param  array  $context Опции контекста для нормализации
     */
    public function normalize($object, $format = null, array $context = array())
    {
        $main_data = [
            'id'     => $object->getId(),
            'name'   => $object->getName(),
            'itemCode' => $object->getId(),
            'article' => $object->getArticle(),
            'node' => $object->getNode()?$object->getNode()->getId():$object->getNode(),
        ];

        if($context['add-children']??false){
            $main_data = array_merge($main_data, [
              'resources' => array_map(
                  function (Resource $resource) use ($format, $context){
                      return $this->serializer->normalize($resource, $format, $context);
                  },
                  $object->getResources()->toArray()
              ),
          ]);
        }

        if($context['add-children-count']??false){
            $main_data = array_merge($main_data, [
              'resource_count' => sizeof($object->getOriginalResources())
          ]);
        }

        return $main_data;
    }

    /**
     * {@inheritdoc}
     *
     * @param $data Данные для проверки
     * @param $format Формат сериализации/десериализации
     *
     */
    public function supportsNormalization($data, $format = null)
    {
        return $data instanceof CatalogueNodeItem;
    }
}
