# meshify-app

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn serve
```

### Compiles and minifies for production
```
yarn build
npm run electron:build -- --linux deb --arm64 --dir   # arm64 cross compile
npm run electron:build -- --linux deb --armv7l --dir  # pi cross compile

```

### Lints and fixes files
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
