<?php
/**
  * Сервис для создания, обновления, удаления и получения информации по объектам типа "Link"
  */

namespace App\Service;

use Doctrine\ORM\EntityManagerInterface;
use App\Entity\Link;
use App\Entity\Security\User;
use App\Entity\Resource;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\DependencyInjection\ContainerInterface;
use \Imagine\Imagick\Imagine;
use \Imagine\Image\Box;
use \Imagine\Image\ImageInterface;
use App\Exception\LinkExpiredException;
use App\Exception\AccessDeniedException;
use App\Exception\ItemNotFoundException;
use App\Exception\InvalidFormatException;
use App\Service\ResourceService;

/**
  * Сервис для создания, обновления, удаления и получения информации по объектам типа "Link"
  *
  */
class LinkService{
  /**
  * Инструмент работы с сущностями Doctrine ORM
  */
private $entityManager;
  /**
  * Сервис-контейнер Symfony
  */
private $container;
  /**
  * Сервис работы с файловой системой Symfony
  */
private $fileSystem;

private $resourceService;

  /**
    * Конструктор класса
    *
    * @param EntityManagerInterface $entityManager Для создания и обновления сущностей в базе данных
    * @param ContainerInterface $container Для получения параметров конфигурации
    * @param Filesystem $fileSystem Для удаления ранее созданных изображений, не привязанных к ресурсу
    * @param ResourceService $resourceService Для работы с с ущностями типа Resource
    */
  public function __construct(EntityManagerInterface $entityManager, ContainerInterface $container, Filesystem $fileSystem, ResourceService $resourceService)
  {
    $this->entityManager = $entityManager;
    $this->container = $container;
    $this->fileSystem = $fileSystem;
    $this->resourceService = $resourceService;
  }

  /**
    * Создает новую запись типа "Link"  базе данных без ряда полей, так что впоследствии запись должна быть обновлена для полноценной работы
    *
    * @param mixed[] $params Параметры из формы для создания новой ссылки
    *
    * @return $link объект сгенерированной ссылки
    *
    */
  public function createLink($params)
  {
    $link = new Link();

    $createdOn = date_create();

    if($params['created_by'] instanceof User){
      $user = $params['created_by'];
    }
    else{
      $user = $this->entityManager->getRepository(User::class)->findOneBy(['id'=>$params['created_by']]);
    }

    $user_id = $user->getId();
    $hash = $this->_generateHash($user_id, date_format($createdOn, 'U'), rand());
    $external_url = $this->container->getParameter('link_url_prefix').'/'.$hash.".jpg";

    $expires = $params['expires_by']==""?NULL:date_create_from_format("Y-m-d", $params['expires_by']);

    $link->setAccess($params['access'])
    ->setTarget($params['target'])
    ->setExpiresBy($expires)
    ->setComment($params['comment'])
    ->setMaxRequests($params['max_requests'])
    ->setCreatedBy($user)
    ->setExternalUrl($external_url)
    ->setCreatedOn($createdOn)
    ->setActive(true)
    ->setReady(false)
    ->setDoneRequests(0)
    ->setHash($hash)
    ->setSrcId($params['resource'])
    ->setSymLink(true)
    ;

    $this->entityManager->persist($link);
    $this->entityManager->flush();

    return $link;
  }

  /**
    * Обновляет ранее созданную ссылку и добавляет в нее необходимые поля, либо после создания нового изображения, либо после выбора существующего ресурса
    *
    * @param mixed[] $params Параметры для обновления ссылки
    */
  public function updateLink($params)
  {
    $link = $this->entityManager->getRepository(Link::class)->findOneBy([
      'id'=>$params['id']
    ]);
    if(sizeof(array_intersect(array_keys($params),['path','size_px','size_bytes','max_requests','symlink','expires_by','target','access','comment']))){
      $link->setReady(true);
    }
    if(array_search('path', array_keys($params)) !== false && $params['path'] !== ''){$link->setPath($params['path']);}
    if(array_search('size_px', array_keys($params)) !== false && $params['size_px'] !== ''){$link->setSizePx($params['size_px']);}
    if(array_search('size_bytes', array_keys($params)) !== false && $params['size_bytes'] !== ''){$link->setSizeBytes($params['size_bytes']);}
    if(array_search('max_requests', array_keys($params)) !== false && $params['max_requests'] !== ''){$link->setMaxRequests($params['max_requests']);}
    if(array_search('symlink', array_keys($params)) !== false && $params['symlink'] !== ''){$link->setSymLink($params['symlink']);}
    if(array_search('expires_by', array_keys($params)) !== false && $params['expires_by'] !== ''){$link->setExpiresBy($params['expires_by']);}
    if(array_search('target', array_keys($params)) !== false && $params['target'] !== ''){$link->setTarget($params['target']);}
    if(array_search('access', array_keys($params)) !== false && $params['access'] !== ''){$link->setAccess($params['access']);}
    if(array_search('comment', array_keys($params)) !== false && $params['comment'] !== ''){$link->setComment($params['comment']);}
    $link->setUpdatedOn(date_create());
    $this->entityManager->flush();
  }

  /**
    * Делает проверку на предмет того, является ли кнкретный пользователь создателем ссылки
    *
    * @param int $link_id Идентификатор ссылки
    * @param int $user_id Идентификтор польователя
    *
    * @return bool true в случае, если пользователь является создателем, false в обратном случае
    *
    */
  public function userIsOwner($link_id, $user_id)
  {
    $repo = $this->entityManager->getRepository(Link::class);
    $link = $repo->findOneBy([
      "id"=>$link_id
    ]);
    if($link->getCreatedBy()->getId() === $user_id){
      return true;
    }
    return false;
  }

  /**
    * Генерирует уникальный идентификатор ссылки
    *
    * @param mixed Все аргументы этой функции станут основой для генерации
    *
    * @return string Сгенерированная строка-идентификатор
    *
    * TODO привести к стандарту параметры для создания идентификатора
    *
    */
  private function _generateHash()
  {
    $src_string = implode('', func_get_args());
    return md5($src_string);
  }

  /**
    * Получает изображение по запрошенной ссылке, сделав проверку на ограничения по количеству запросов, сроку действия и допустимым IP-адресам
    *
    * @param string $hash Идентификатор ссылки
    * @param Request $request Обхект запроса, по которому необходимо отдать изображение
    * @param User $user Пользователь, если есть, который сделал запрос
    *
    * @return string Сгенерированная строка-идентификатор
    *
    *
    */

  public function getImageData($hash, $request, $user)
  {
    $link = $this->entityManager->getRepository(Link::class)->findOneBy([
      'hash'=>$hash
    ]);
    $created_by = $link->getCreatedBy()->getId();
    if(is_null($user) && !$this->_checkAccess($link, $request)){
      throw new AccessDeniedException("Доступ к ссылке запрещен");
    }
    if(is_null($user) && (!$this->_countRequests($link) || !$this->_isNotExpired($link)))
    {
      throw new LinkExpiredException("Истек срок действия ссылки");
    }

    if($link->getSymlink() == 0){
      $path = $link->getPath();
    }else{
      $path = $this->entityManager->getRepository(Resource::class)->findOneBy(['id'=>$link->getSrcId()])->getPath();
    }

    $path = $this->container->getParameter('local_file_dir').$path;
    $image = file_get_contents($path);

    $filename = $link->getHash().'.jpg';
    return [
        'filename'=>$filename,
        'content'=>$image
    ];
  }

  /**
    * Проверяет, истек ли срок действия ссылки
    *
    * @param Link $link Объект ссылки
    *
    * @return bool true если срок не истек, false если истек
    *
    */
  private function _isNotExpired($link)
  {
    $currentDate = date_create();
    $expiresBy = $link->getExpiresBy();
    if($expiresBy == NULL){
      return true;
    }
    if($currentDate>=$expiresBy){
      return false;
    }
    return true;
  }

  /**
    * Проверяет, входит ли IP-адрес запросившенго ссылку в список разрешенных для этой ссылки
    *
    * @param Link $link Объект ссылки
    * @param Request $request Обхект запроса, по которому необходимо отдать изображение
    *
    * @return bool true если дотуп для адреса разрешен, false сли нет
    *
    */
  private function _checkAccess($link, $request)
  {
    $access = $link->getAccess();
    if($access == NULL){
      return true;
    }
    preg_match('/\b(?:\d{1,3}\.){3}\d{1,3}\b/', $access, $ip_addresses);
    if(in_array($request->getClientIp(), $ip_addresses)){
        return true;
    }
    return false;
  }

  /**
    * Ведет подсчет в базе данных о количестве проведенных запросов, и сообщает о превышении лимита
    *
    * @param Link $link Объект ссылки
    *
    * @return bool true если лимит запросов не превышен, false ли превышен
    *
    */
  private function _countRequests($link)
  {
    $doneRequests = $link->getDoneRequests();
    $maxRequests = $link->getMaxRequests();
    if($maxRequests== NULL){
      return true;
    }
    if($doneRequests>=$maxRequests){return false;}
    $link->setDoneRequests($doneRequests+1);
    $this->entityManager->flush();
    return true;
  }

  /**
    * Получает все ссылки, привязанные к конкретному пользователю
    *
    * @param User $user Объект пользователя
    *
    * @return Link[] $links Массив полученных ссылок
    *
    */
  public function fetchAllForUser($user)
  {
    $links = $this->entityManager->getRepository(Link::class)->findBy([
      'created_by'=>$user->getId()
    ]);
    return $links;
  }

  /**
    * Получает все ссылки, привязанные к конкретному пользователю, включая дополнительные поля о привязанном ресурсе и товаре
    *
    * @param User $user Объект пользователя
    *
    * @return mixed[] $links Массив полученных ссылок
    *
    */
  public function fetchAllWithExtraFields($user)
  {
    $links = $this->entityManager->getRepository(Link::class)->fetchWithResourceAndItemInfo($user->getId());
    return $links;
  }

  /**
    * Отправляет в messenger сообщение для удаления ссылки
    *
    * @param int $link Идентификатор ссылки
    * @param int $user Идентификатор пользователя
    *
    * @return bool true в случае успешного удаления
    *
    *
    */
  public function deleteLink($link, $user)
  {
    $link = $this->entityManager->getRepository(Link::class)->findOneBy([
      'id'=>$link
    ]);
    if($link == null){return false;}
    if($link->getCreatedBy()->getId() !== $user){return false;}
    if($link->getSymlink() == 0){
      if(preg_match('/\.jpg$/',$link->getPath())){
        $this->fileSystem->remove($link->getPath());
      }else{
        throw new InvalidFormatException("Файл не является изображением");
      }
    }
    $this->entityManager->remove($link);
    $this->entityManager->flush();
    return true;
  }

  /**
    * Получает plaintext-список ссылок из массива идентификаторов
    *
    * @param string $ids Идентификаторы ссылок через запятую
    *
    * @return string $urls Список ссылок
    *
    * TODO вынести префикс ссылки в конфигурацию
    *
    */
  public function getUrls($ids){
    if(!is_array($ids)){
      $ids = explode(",", $ids);
    }
    $repo = $this->entityManager->getRepository(Link::class);
    $urls = array();
    foreach($ids as $id){
      $link = $repo->findOneBy([
        'id'=>$id
      ]);
      array_push($urls, 'https://photobank.domfarfora.ru'.$link->getExternalUrl().",");
    }
    $urls = implode($urls, "\n");
    return $urls;
  }

  /**
    * Проводит валидацию полей формы для добавления ссылки
    *
    * @param mixed[] $data Идентификатор ссылки
    *
    * @return mixed[] Ответ валидации в формате [успешно, текст_ошибки]
    *
    */
  public function validateForm($data){
    if(isset($data['resource']) && $data['resource'] !== ''){
      $resourceIds = explode(',',$data['resource']);
    }else{
        return [false, 'Необходимо указать ресурс'];
    }
    $sizeIsSet = isset($data['size']['width']) && isset($data['size']['height']);
    if($sizeIsSet){
      $sizeWithinBounds = ($data['size']['width']>=32&&$data['size']['height']>=32&&$data['size']['width']<=4096&&$data['size']['height']<=2160);
      $ratioOk = $sizeWithinBounds&&($data['size']['width']/$data['size']['height'] <= 2.3 && $data['size']['width']/$data['size']['height'] >= 1);
      if(!$ratioOk){
        return [false, "Неверное соотношение высоты/ширины"];
      }
    }elseif(isset($data['size']['width'])||isset($data['size']['height'])){
      return [false, "Указано только одно из значений ширина/высота"];
    }
    return [true, ""];
  }

  public function getTempLinks($request)
  {
    if(!isset($request['items'])){
      throw new ItemNotFoundException();
    }

    $links = [];

    foreach($request['items'] as $item_id){

      $params = [];

      $resource = $this->resourceService->getByItemPriorityPreset($item_id, 1, 4);

      if(!$resource){
        $links[$item_id]="";
        continue;
      }

      $resourceId = $resource->getId();

      $link = $this->entityManager->getRepository(Link::class)->findOneBy(['src_id'=>$resourceId,'created_by'=>1]);

      if(!$link){
        $params['expires_by'] = isset($request['expires_by'])?isset($request['expires_by']):NULL;//date("Y-m-d",strtotime('+5 day', time()));
        $params['access'] = isset($request['access'])?isset($request['access']):NULL;
        $params['target'] = isset($request['target'])?isset($request['target']):'xml';
        $params['comment'] = isset($request['comment'])?isset($request['comment']):'autogenerated';
        $params['max_requests'] = isset($request['max_requests'])?isset($request['max_requests']):NULL;
        $params['created_by'] = isset($request['created_by'])?isset($request['created_by']):1;
        $params['resource'] = isset($request['resource'])?isset($request['resource']):$resourceId;

        $link = $this->createLink($params);
      }

      $done_requests = $link->getDoneRequests();
      $link->setMaxRequests($done_requests+100);
      $links[$item_id]=$link->getExternalUrl();
    }

    $this->entityManager->flush();

    return $links;
  }
}
