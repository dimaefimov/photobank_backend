<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass="App\Repository\CatalogueNodeItemRepository")
 * @ORM\Table(indexes={@ORM\Index(name="name_idx", columns={"name"})})
 */
class CatalogueNodeItem
{
    /**
    * @ORM\Id()
    * @ORM\GeneratedValue(strategy="NONE")
    * @ORM\Column(type="string", length=11)
    */
    private $id;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $name;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\CatalogueNode", inversedBy="items")
     * @ORM\JoinColumn(nullable=true)
     */
    private $node;

    /**
     * @ORM\OneToMany(targetEntity="App\Entity\Resource", mappedBy="item")
     */
    private $resources;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $article;

    public function __construct()
    {
        $this->resources = new ArrayCollection();
    }

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getNode(): ?CatalogueNode
    {
        return $this->node;
    }

    public function setNode(?CatalogueNode $node): self
    {
        $this->node = $node;

        return $this;
    }

    /**
     * @return Collection|Resource[]
     */
    public function getResources(): Collection
    {
        return $this->resources;
    }

    public function getOriginalResources()
    {
        return array_filter($this->getResources()->toArray(),function($res){return $res->getType()!==4;});
    }

    public function addResource(Resource $resource): self
    {
        if (!$this->resources->contains($resource)) {
            $this->resources[] = $resource;
            $resource->setItem($this);
        }

        return $this;
    }

    public function removeResource(Resource $resource): self
    {
        if ($this->resources->contains($resource)) {
            $this->resources->removeElement($resource);
            // set the owning side to null (unless already changed)
            if ($resource->getItem() === $this) {
                $resource->setItem(null);
            }
        }

        return $this;
    }

    public function getArticle(): ?string
    {
        return $this->article;
    }

    public function setArticle(?string $article): self
    {
        $this->article = $article;

        return $this;
    }
}
