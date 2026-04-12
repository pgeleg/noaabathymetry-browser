---
slug: /
sidebar_position: 1
title: Introduction
---

# NOAA Bathymetry UI

Browser-based interface for the [noaabathymetry](https://github.com/noaa-ocs-hydrography/noaabathymetry) Python package.

![NOAA Bathymetry UI](/img/noaabathymetry_ui.png)

## What is the National Bathymetric Source?

NOAA's [National Bathymetric Source](https://nauticalcharts.noaa.gov/learn/nbs.html) (NBS) builds and publishes the best available high-resolution bathymetric data of U.S. waters. The program's workflow is designed for continuous throughput, ensuring the best bathymetric data is always available to professionals and the public.

This data provides depth measurements nationwide, along with vertical uncertainty estimates and information on the originating survey source. It is available in multiple formats hosted on a public S3 bucket:

- **BlueTopo** — GeoTIFF compilations of the best available bathymetric data
- **Modeling** — GeoTIFF compilations for hydrodynamic modeling applications
- **BAG** — Bathymetric Attributed Grid files
- **S-102** — IHO S-102 standard (versions 2.1, 2.2, and 3.0)

## What does this app do?

NOAA Bathymetry UI lets you:

- **Explore** NBS data on an interactive map with multiple data source layers
- **Fetch** tiles in your area of interest to a local project folder
- **Mosaic** downloaded tiles into per-UTM-zone merged rasters
- **Export** your project as a portable ZIP file that others can continue working with

The app runs as a local web server and opens in your default browser. No cloud account or Python environment is required — just download and run.
