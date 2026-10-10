---
layout: single
title: "My cat"
permalink: /cat/
author_profile: true
# Change this path if you use a different folder; keep the trailing slash.
gallery_folder: /images/cat/
---

## Meet my cat!

Her name is Piper and she put all her skill points in charisma. Here are some of my favorite pictures.

<style>
  .cat-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
    gap: 1rem;
    align-items: start;
  }
  .cat-gallery img {
    display: block;
    width: 100%;
    height: auto;
  }
</style>

{% assign photos = site.static_files | sort: 'name' %}
{% assign image_extensions = '.jpg,.jpeg,.png,.gif,.webp,.avif' | split: ',' %}
{% assign folder_length = page.gallery_folder | size %}

<div class="cat-gallery">
{% for photo in photos %}
  {% assign folder_prefix = photo.path | slice: 0, folder_length %}
  {% assign extension = photo.extname | downcase %}
  {% if folder_prefix == page.gallery_folder and image_extensions contains extension %}
    {% assign description = photo.basename | replace: '-', ' ' | replace: '_', ' ' %}
    <a href="{{ photo.path | relative_url | uri_escape | escape }}">
      <img src="{{ photo.path | relative_url | uri_escape | escape }}"
           alt="{{ description | escape }}"
           loading="lazy">
    </a>
  {% endif %}
{% endfor %}
</div>
