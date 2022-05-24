const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: ["vuetify"],
  pluginOptions: {
    electronBuilder: {
      externals: ["vue-d3-network", "chokidar", "apexcharts"],
      builderOptions: {
        productName: "meshifyagent",
        files: ["**/*"],
        extraFiles: [
          {
            from: "public",
            to: "public",
            filter: ["**/*"],
          },
          {
            from: "extra",
            to: "extra",
            filter: ["**/*"],
          },
        ],
      },
      productName: "meshifyagent",
      appId: "app.meshify.meshifyagent",
      author: "alan@meshify.app",
      description: "Unified Meshify Agent",
      win: {
        target: [
          {
            target: "nsis",
            arch: ["x64"],
          },
          {
            target: "msi",
            arch: ["x64"],
          },
          {
            target: "zip",
            arch: ["x64"],
          },
        ],
        publisherName: "Meshify.app Inc.",
        legalTrademarks: "",
        verifyUpdateCodeSignature: false,
        requestedExecutionLevel: "requireAdministrator",
        artifactName: "meshifyapp-${version}-${os}-${arch}.${ext}",
      },
      nsis: {
        include: "build/installer.nsh",
        guid: "41b73002-3848-4760-b965-6d5f43ba67a3",
        deleteAppDataOnUninstall: false,
        oneClick: true,
        perMachine: true,
        allowElevation: true,
        allowToChangeInstallationDirectory: false,
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
      },
    },
  },
});
