---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
---

## Where is the GxCert application?
Access to https://gaiax.github.io/gxcert-app

## Repositories of GxCert
<table>
  <tr>
    <th>Repository</th>
    <th>Feature</th>
  </tr>
  <tr>
    <td><a href="https://github.com/gaiax/gxcert-lib">gxcert-lib</a></td>
    <td>The client library on front-end application.</td>
  </tr>
  <tr>
    <td><a href="https://github.com/gaiax/gxcert-write">gxcert-write</a></td>
    <td>The client library for writing data to blockchain.</td>
  </tr>
  <tr>
    <td><a href="https://github.com/gaiax/gxcert-app">gxcert-app</a></td>
    <td>The front-end application.</td>
  </tr>
</table>

## How to build the front-end application?
### Requirements
<table>
  <tr>
    <th>Software</th>
    <th>Version</th>
  </tr>
  <tr>
    <td>Git</td>
    <td>*</td>
  </tr>
  <tr>
    <td>Node.js</td>
    <td>v16.6.1</td>
  </tr>
  <tr>
    <td>npm</td>
    <td>v7.20.3</td>
  </tr>
</table>

### Step1: Clone
```bash
git clone https://github.com/gaiax/gxcert-app.git
```

### Step2: Install packages
```bash
cd gxcert-app
npm install
```

### Step3: Start local server of development environment
You can run local server when you want to test your code.
```bash
npm start
```

### Step4: Build
You can build the source code after you edited the source code.

```bash
npm build
```


