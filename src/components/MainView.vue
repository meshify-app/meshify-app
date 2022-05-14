<template>
  <div>
    <div class="row">
      <header class="col-md-12">
        <nav class="navbar navbar-dark bg-dark">
          <span>
            &nbsp;
            <a class="navbar-brand" href="https://my.meshify.app"
              ><img
                class="mr-3"
                :src="require('../assets/meshify.png')"
                height="50"
                alt="meshify"
            /></a>
            <a class="navbar-brand">meshify.app</a>
          </span>
          <v-spacer />
          <span>
            <button @click="startCreate()" class="btn btn-primary my-2 my-sm-0">
              Add to Mesh
            </button>
            &nbsp;
            <button class="btn btn-danger" @click="logout()" type="button">
              Logout
            </button>
            &nbsp;
          </span>
        </nav>
      </header>
    </div>
    <div class="row" id="exp">
      <h4 style="align: center">{{ meshName }}</h4>
      <div class="chart-wrapper">
        <apexChart
          v-show="showChart"
          ref="chart1"
          id="chart1"
          dark
          width="400"
          type="line"
          :options="goptions"
          :series="series"
        ></apexChart>
        <d3-network
          class="network"
          :net-nodes="nodes"
          :net-links="links"
          :options="options"
        />
      </div>
      <v-expansion-panels dark>
        <v-expansion-panel
          @click="loadNetwork"
          v-for="(mesh, i) in meshes"
          :key="i"
        >
          <v-expansion-panel-header>
            {{ mesh.meshName }}
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-data-table
              dark
              :headers="headers"
              :items="mesh.hosts"
              :search="search"
            >
              <!-- eslint-disable-next-line -->
              <template v-slot:item.action="{ item }">
                <v-btn class="mx-2" icon @click="launchRDP(item)">
                  <v-icon dark title="Remote Desktop">
                    mdi-remote-desktop
                  </v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <v-dialog v-model="dialogCreate" max-width="550">
      <v-card>
        <v-card-title class="headline">Add Host to Mesh</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-form ref="form" v-model="valid">
                <v-text-field
                  v-model="hostName"
                  label="Host friendly name"
                  :rules="[(v) => !!v || 'host name is required']"
                  required
                />
                <v-select
                  return-object
                  v-model="meshList.selected"
                  :items="meshList.items"
                  item-text="text"
                  item-value="value"
                  label="Join this mesh"
                  :rules="[(v) => !!v || 'Mesh is required']"
                  single
                  persistent-hint
                  required
                />
                <v-text-field
                  v-model="endpoint"
                  label="Public endpoint for clients"
                />
                <v-text-field
                  v-model="listenPort"
                  type="number"
                  label="Listen port"
                />
              </v-form>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="!valid" color="success" @click="create(host)">
            Submit
            <v-icon right dark>mdi-check-outline</v-icon>
          </v-btn>
          <v-btn color="primary" @click="dialogCreate = false">
            Cancel
            <v-icon right dark>mdi-close-circle-outline</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
const { remote } = window.require("electron");
const axios = require("axios");
const fs = window.require("fs");
const D3Network = window.require("vue-d3-network");
const ipcRenderer = window.require("electron").ipcRenderer;
// const shell = window.require("electron").shell;
const spawn = window.require("child_process").spawn;
const exec = window.require("child_process").exec;
const env = require("../../env");
const ApexCharts = window.require("apexcharts");

var { serverUrl, appData } = env;

if (process.env.ALLUSERSPROFILE != null) {
  appData = process.env.ALLUSERSPROFILE;
}

let Meshes;
ipcRenderer.on("handle-config", (e, arg) => {
  // document window
  Meshes = arg;
  console.log(Meshes);
});

export default {
  name: "MainView",
  components: {
    D3Network,
  },
  data: () => ({
    search: "",
    headers: [
      { text: "Name", value: "name" },
      { text: "Address", value: "current.address" },
      { text: "Endpoint", value: "current.endpoint" },
      { text: "Actions", value: "action", sortable: false },
    ],
    meshifyConfig: {},
    meshes: [],
    mesh: null,
    meshName: "",
    myMeshes: [],
    nodes: [],
    links: [],
    nodeSize: 50,
    selected: "",
    dialogCreate: false,
    host: null,
    valid: false,
    meshList: {},
    endpoint: "",
    listenPort: 0,
    tags: [],
    hostEnable: true,
    hostName: "",
    showChart: false,
    goptions: {
      grid: {
        show: true,
      },
      stroke: {
        width: 2,
      },
      theme: {
        mode: "dark",
      },
      title: {
        text: "",
      },
      chart: {
        id: "chart",
        toolbar: {
          show: false,
        },
        responsive: [
          {
            breakpoint: 480,
            options: {
              chart: {
                width: 200,
              },
              legend: {
                show: false,
              },
            },
          },
        ],
      },
      xaxis: {
        categories: ["1min", 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5],
      },
    },
    series: [],
    seriesInit: false,
    chart: null,
  }),
  computed: {
    options() {
      return {
        force: 4000,
        size: { w: 600, h: 400 },
        nodeSize: this.nodeSize,
        nodeLabels: true,
        linkLabels: true,
        canvas: this.canvas,
      };
    },
  },
  created() {
    this.$vuetify.theme.dark = true;
    let config = [];

    this.chart = new ApexCharts(
      window.document.querySelector("chart"),
      this.goptions
    );
    try {
      config = JSON.parse(fs.readFileSync(appData + "\\Meshify\\meshify.conf"));
    } catch (e) {
      console.error("meshify.conf does not exist: ", e.toString());
    }

    console.log("Config = ", config);
    this.meshes = config.config;

    try {
      this.meshifyConfig = JSON.parse(
        fs.readFileSync(appData + "\\Meshify\\meshify-client.config.json")
      );
    } catch (e) {
      console.error(
        "meshify-client.config.json does not exist: ",
        e.toString()
      );
      this.meshifyConfig = {};
      this.meshifyConfig.MeshifyHost = serverUrl;
      this.meshifyConfig.SourceAddress = "0.0.0.0";
      this.meshifyConfig.Quiet = true;
      this.meshifyConfig.CheckInterval = 10;
      this.meshifyConfig.HostID = "";
    }
    this.getMeshList();
    // setInterval(loadMeshes, 1000);
    setInterval(() => {
      this.loadMeshes();
      if (this.mesh != null) {
        this.getMetrics(this, this.mesh.meshName);
      }
    }, 5000);
  },
  methods: {
    async logout() {
      const win = new remote.BrowserWindow({
        width: 800,
        height: 600,
        show: false,
      });
      win.loadURL("http://auth.meshify.app/v2/logout");
      // win.close();
      // remote.getCurrentWindow().loadURL("http://auth.meshify.app/v2/logout");
      // remote.getCurrentWindow().close();
    },
    loadMeshes() {
      if (Meshes) {
        this.meshes = Meshes;
        Meshes = null;
        console.log("loadMeshes Config = ", this.meshes);
      }
    },
    launchSSH(item) {
      console.log("SSH Item: ", item);
      exec("cmd.exe", item.name);
      spawn("cmd.exe", [item.name], { windowsHide: false });
    },
    launchRDP(item) {
      console.log("RDP Item", item);
      spawn("mstsc.exe", ["/v:" + item.name]);
    },
    startCreate() {
      this.host = {
        name: "",
        email: "",
        enable: true,
        tags: [],
        current: {},
      };

      // if (Meshes != null) {
      //  this.meshes = Meshes;
      //}
      this.getMeshList();

      this.meshList = { selected: { text: "", value: "" }, items: [] };

      var selected = 0;
      for (let i = 0; i < this.myMeshes.length; i++) {
        this.meshList.items[i] = {
          text: this.myMeshes[i].meshName,
          value: this.myMeshes[i].id,
        };
        if (this.meshList.items[i].text == this.host.meshName) {
          selected = i;
        }
      }

      this.meshList.selected = this.meshList.items[selected];
      this.dialogCreate = true;
    },

    getMetrics(that, mesh) {
      let stats;
      axios
        .get("http://127.0.0.1:53280/stats/" + mesh, {
          headers: {},
        })
        .then((response) => {
          stats = response.data;
          console.log("Stats = ", stats);

          if (this.series.length == 0 || this.seriesInit) {
            // this.series = [response.data.length];
            console.log("seriesInit = %s", this.seriesInit);
            this.seriesInit = false;
            that.series[0] = {
              name: "Sent",
              data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              last: stats[mesh].Send,
              head: 0,
              buckets: 12,
            };
            that.series[1] = {
              name: "Received",
              data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              last: stats[mesh].Recv,
              head: 0,
              buckets: 12,
            };
          }
          for (let i = 1; i < 12; i++) {
            that.series[0].data[i - 1] = that.series[0].data[i];
            that.series[1].data[i - 1] = that.series[1].data[i];
          }
          that.series[0].data[11] = stats[mesh].Send - that.series[0].last;
          that.series[0].head = that.series[0].head + 1;
          that.series[0].last = stats[mesh].Send;
          that.series[1].data[11] = stats[mesh].Recv - that.series[1].last;
          that.series[1].head = that.series[1].head + 1;
          that.series[1].last = stats[mesh].Recv;
          console.log("Send %d %d", that.series[0].head, that.series[0].last);
          console.log("Recv %d %d", that.series[1].head, that.series[1].last);

          that.$refs.chart1.updateSeries([that.series[0], that.series[1]]);
        });
      // .catch(() => {});
      //       {
      // name: "",
      // data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      // head: 0,
      // buckets: 12,
    },
    create(host) {
      this.host.name = this.hostName;
      this.host.current.endpoint = this.endpoint;
      this.host.current.listenPort = this.listenPort;
      this.host.current.listenPort = parseInt(this.host.current.listenPort, 10);
      this.host.meshName = this.meshList.selected.text;
      this.host.meshid = this.meshList.selected.value;
      this.host.hostGroup = this.meshifyConfig.hostId;
      this.dialogCreate = false;
      this.createHost(host);
    },
    createHost(host) {
      let accessToken = remote.getGlobal("accessToken");
      let body = {
        grant_type: "authorization_code",
        client_id: "Dz2KZcK8BT7ELBb91VnFzg8Xg1II6nLb",
        state: accessToken,
        code: accessToken,
        redirect_uri: serverUrl,
      };
      axios
        .post(serverUrl + "/api/v1.0/auth/token", body, {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        })
        .then(() => {
          axios
            .post(serverUrl + "/api/v1.0/host", host, {
              headers: {
                Authorization: "Bearer " + accessToken,
              },
            })
            .then((response) => {
              let config;
              try {
                config = JSON.parse(
                  fs.readFileSync(appData + "\\Meshify\\meshify.conf")
                );
                console.log("Config = ", config);
                this.meshes = config.config;
              } catch (e) {
                console.log("Could not open meshify.conf:", e);
              }
              let host = response.data;
              console.log("Host = ", host);
              let changed = false;
              console.log("Checking meshify-client.config.json for updates");
              if (this.meshifyConfig.hostId == null) {
                this.meshifyConfig.hostId = host.hostGroup;
                this.meshifyConfig.apiKey = host.apiKey;
                changed = true;
                console.log(
                  "this.meshifyConfig changed = ",
                  this.meshifyConfig
                );
              }
              if (changed) {
                console.log("Writing new meshify-client.config.json");
                fs.writeFileSync(
                  appData + "\\Meshify\\meshify-client.config.json",
                  JSON.stringify(this.meshifyConfig)
                );
                console.log(
                  "meshify-client.config.json has been updated :",
                  this.meshifyConfig
                );
              }
            })
            .catch((error) => {
              if (error) console.error(error);
            });
        })
        .catch((error) => {
          if (error) throw new Error(error);
        });
    },
    getMeshList() {
      let accessToken = remote.getGlobal("accessToken");
      let body = {
        grant_type: "authorization_code",
        client_id: "Dz2KZcK8BT7ELBb91VnFzg8Xg1II6nLb",
        state: accessToken,
        code: accessToken,
        redirect_uri: "https://dev.meshify.app",
      };
      axios
        .post("https://dev.meshify.app/api/v1.0/auth/token", body, {
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        })
        .then(() => {
          axios
            .get("https://dev.meshify.app/api/v1.0/mesh", {
              headers: {
                Authorization: "Bearer " + accessToken,
              },
            })
            .then((response) => {
              this.myMeshes = response.data;
            })
            .catch((error) => {
              if (error) console.error(error);
            });
        })
        .catch((error) => {
          if (error) throw new Error(error);
        });
    },
    loadNetwork(evt) {
      let name = evt.currentTarget.innerText;
      let x = 0;
      let l = 0;
      this.links = [];
      this.nodes = [];
      let mesh_hosts = [];
      for (let i = 0; i < this.meshes.length; i++) {
        if (this.meshes[i].meshName == name) {
          this.mesh = this.meshes[i];
          break;
        }
      }
      this.seriesInit = true;
      this.meshName = this.mesh.meshName;
      this.showChart = true;
      // this.getMetrics(this.mesh.meshName);

      for (let i = 0; i < this.mesh.hosts.length; i++) {
        if (this.mesh.hosts[i].meshName == name) {
          mesh_hosts[x] = this.mesh.hosts[i];
          this.nodes[x] = {
            id: x,
            name: this.mesh.hosts[i].name /* _color:'gray'*/,
          };
          x++;
        }
      }
      for (let i = 0; i < mesh_hosts.length; i++) {
        for (let j = 0; j < mesh_hosts.length; j++) {
          if (i != j && mesh_hosts[j].current.endpoint != "") {
            this.links[l] = { sid: i, tid: j, _color: "white" };
            l++;
          }
        }
      }
    },
  },
};
</script>
<style>
@import "~bootstrap/dist/css/bootstrap.min.css";
body {
  background: #333;
  color: white;
}
::-webkit-scrollbar {
  overflow: auto;
}
text {
  font-size: 12px;
  color: orange;
  fill: orange;
}
.node {
  fill: #336699;
  stroke: #5b81a7;
}
/*
.link {
  color: white;
}
*/
.net-svg {
  margin: 0 auto;
}
.network {
  display: flex;
  justify-content: center;
}
div.chart-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
