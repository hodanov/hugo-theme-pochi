---
title: "Image Size Hints"
slug: "p-19-image-size"
date: "2024-05-19T09:00:00+09:00"
publishDate: "2024-05-19T09:00:00+09:00"
lastmod: "2024-05-19T09:00:00+09:00"
draft: false
summary: "E2E: Markdown image size hints via the title attribute and raw <img> HTML."
tags: ["image"]
categories: ["news"]
---

A post that verifies the Markdown image size hint syntax and raw `<img>` usage.

## No size hint (baseline)

![Baseline sample photo](sample.jpg)

## Width only (`=300x`)

![Width-only sample](sample.jpg "=300x")

## Width and height (`=300x200`)

![Width-and-height sample](sample.jpg "=300x200")

## Height only (`=x200`)

![Height-only sample](sample.jpg "=x200")

## Raw HTML `<img width="...">`

<img src="/posts/p-19-image-size/sample.jpg" alt="Raw HTML sample" width="300">

## Non-size title (legacy behaviour)

![Legacy title sample](sample.jpg "Just a caption, not a size hint")
