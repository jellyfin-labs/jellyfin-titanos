<h1 align="center">Jellyfin Titan OS</h1>
<h3 align="center">Part of the <a href="https://jellyfin.org">Jellyfin Project</a></h3>

---

<img alt="Logo Banner" src="https://raw.githubusercontent.com/jellyfin/jellyfin-ux/master/branding/SVG/banner-logo-solid.svg?sanitize=true"/>

Jellyfin for Titan OS is the official Jellyfin client for devices using [Titan OS](https://www.titanos.tv/). The client is a bundle of [jellyfin-web](https://github.com/jellyfin/jellyfin-web) with a custom native shell implementation.

## Repository structure

```
.
├── scripts/      Scripting to build and manage this project
├── src/          Source code for the native shell implementation
```

## Develop & build

This repository uses a git submodule and requires Node.js and NPM and exposes various NPM scripts to build and manage the repository. The scripts assume they're running in a validly cloned git repository with the submodules checked out.

### Update Jellyfin web

```sh
npm run update:web [version]
```

Update the git submodule to a specific version of jellyfin-web.

### Build Jellyfin web

```sh
npm run build:web
```

Installs the dependencies for jellyfin-web and builds it for production.

### Build nativeshell

```sh
npm run build:nativeshell
```

Builds the Titan OS specific native shell.

### Package

```sh
npm run package
```

Depends on the build commands being run first. Bundles the jellyfin-web and native shell sources and injects the native shell into the index.html file.

### Serve

```sh
npm run serve
```

Serves the resulting files from the package script over HTTP. It will prefer the nativeshell builds over the package build making it quicker to develop and only run the nativeshell build when changes are made.

### Clean

```sh
npm run clean
```

Cleans the build artifacts.
