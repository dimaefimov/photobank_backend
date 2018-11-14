<?php

namespace App\Console;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Filesystem\Filesystem;
use App\Service\ResourceService;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\Resource;

class BulkGeneratePresetsCommand extends Command
{
    private $resourceService;
    private $container;
    private $entityManager;
    private $fileSystem;

    public function __construct(ContainerInterface $container, EntityManagerInterface $entityManager, ResourceService $resourceService, Filesystem $fileSystem){
      $this->container = $container;
      $this->entityManager = $entityManager;
      $this->resourceService = $resourceService;
      $this->fileSystem = $fileSystem;
      parent::__construct();
    }

    protected function configure()
    {
        $this
            ->setName('app:resource:bulk-generate-presets')
            ->setDescription('Generate presets for items specified in file')
            ->addArgument(
                'file',
                InputArgument::REQUIRED,
                'path to file with a comma separated item list'
            )
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
      set_time_limit(0);
      $res = array();
      $repo = $this->entityManager->getRepository(Resource::class);

      $fh = fopen(__DIR__.'/../../'.$input->getArgument('file'), 'r');
      if (!feof($fh)) {
        $line = fgets($fh);
      }

      $itemArr = explode(',', $line);
      foreach($itemArr as $item){
        $resources = $repo->findBy(["item"=>$item,"autogenerated"=>0]);
        $res = array_merge($res,$resources);
      }

      foreach($res as $r){
        $this->resourceService->dispatchPresetMessages($r->getId(), $r->getType());
      }

      fclose($fh);

      $output->writeln("Done");
    }

}
