<p align="center"><img src="icon.svg"></p>

<h1 align="center">tropy-plugin-omeka</h1>

This is a plugin for [Tropy](https://tropy.org). It can export selected items into an [Omeka S](https://omeka.org/s/) instance.

## Installation

Download the `.zip` file, named `tropy-plugin-omeka` plus a version number, from the [latest release](https://github.com/tropy/tropy-plugin-omeka/releases/latest) on GitHub. In Tropy, navigate to *Preferences… > Plugins* and click *Install Plugin* to select the downloaded ZIP file.

## Plugin configuration

To configure the plugin, click its *Settings* button in *Preferences > Plugins*:

Some settings apply to both import and export:

- Choose a plugin *Name* that will show up in the *File > Export* menu.
- Fill in the *Identity key* and *Credential key* fields, which can be found in Omeka S under *User Preferences > API keys*.
- Fill in the *Omeka API URL* for your instance of Omeka S.
- Optionally, specify the *Resource Template ID* of the Omeka resource template to be applied to the exported items.
- Use the *+* icon at the far right to create new plugin instances (so you can have multiple configurations in parallel).

## Usage

Select the items to export, then click *File > Export > tropy-plugin-omeka* to start the export. The plugin will upload the selected items to the specified Omeka instance.

## Feedback

Missing a feature or having problems? Please head over to the [Tropy forums](https://forums.tropy.org/) and let us know.
