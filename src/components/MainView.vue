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
            <a class="navbar-brand">meshify.agent</a>
          </span>
          <v-spacer />
          <span>
            <button
              class="btn btn-primary my-2 my-sm-0"
              icon
              @click="startSettings()"
            >
              <v-icon title="Settings" dark> mdi-cog </v-icon>
              Settings
            </button>
            &nbsp;
            <button
              :disabled="addMeshDisabled"
              @click="startCreate()"
              class="btn btn-primary my-2 my-sm-0"
            >
              <img
                class="ml-1"
                :src="require('../assets/meshify-bw.png')"
                height="24"
                width="24"
                alt="meshify"
              />
              Add to Mesh
            </button>
            &nbsp;
            <button class="btn btn-danger" @click="login()" type="button">
              <v-icon title="Authentication" dark> mdi-lock </v-icon>
              {{ loginText }}
            </button>
            &nbsp;
          </span>
        </nav>
      </header>
    </div>
    <div class="row" id="exp">
      <h4 style="align: center">{{ meshName }}</h4>
      <div class="chart-wrapper">
        <div
          id="canvas"
          v-show="showDns"
          style="
            border: 1px solid #000000;
            background: #333;
            width: 400px;
            min-width: 200px;
            height: 300px;
            overflow-y: auto;
            padding: 5px;
            margin-right: 5px;
            margin-left: 5px;
          "
        >
          <b>DNS Queries</b>
          <div
            v-for="(query, index) in queries"
            :key="index"
            style="font-size: 12px"
          >
            {{ query }}
          </div>
        </div>
        <apexChart
          v-show="showChart"
          ref="chart1"
          id="chart1"
          dark
          width="400"
          height="300"
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
            <v-switch
              dark
              class="px-0"
              color="success"
              v-model="mesh.enable"
              v-on:change="update(mesh)"
            />
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
                <v-btn class="mx-2" icon @click="launchSSH(item)">
                  <v-icon dark title="SSH"> mdi-lan-connect </v-icon>
                </v-btn>
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
    <v-dialog v-model="dialogSettings" max-width="550">
      <v-card>
        <v-card-title class="headline">Settings</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-form ref="form" v-model="valid">
                <v-text-field
                  v-model="meshifyHost"
                  label="Meshify Host"
                  :rules="[
                    (v) =>
                      !!v || 'host is required, eg. https://my.meshify.app/',
                  ]"
                  required
                />
                <v-text-field
                  v-model="hostId"
                  label="Host Group"
                  :rules="[(v) => !!v || 'Host Group is required']"
                  required
                />
                <v-text-field
                  v-model="apiKey"
                  label="Api Key"
                  :rules="[(v) => !!v || 'Api Key is required']"
                  required
                />
              </v-form>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="!valid" color="success" @click="saveSettings()">
            Submit
            <v-icon right dark>mdi-check-outline</v-icon>
          </v-btn>
          <v-btn color="primary" @click="dialogSettings = false">
            Cancel
            <v-icon right dark>mdi-close-circle-outline</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<script>
const axios = require("axios");
const fs = window.require("fs");
const D3Network = window.require("vue-d3-network");
const ipcRenderer = window.require("electron").ipcRenderer;
const spawn = window.require("child_process").spawn;
const env = require("../../env");
const ApexCharts = window.require("apexcharts");
const os = window.require("os");

var { serverUrl, appData } = env;

if (process.env.ALLUSERSPROFILE != null) {
  appData = process.env.ALLUSERSPROFILE;
}

let MeshifyConfigPath = appData + "\\meshify\\meshify.conf";
let MeshifyClientPath = appData + "\\meshify\\meshify-client.config.json";

if (os.platform() == "linux") {
  MeshifyConfigPath = "/etc/meshify/meshify.conf";
  MeshifyClientPath = "/etc/meshify/meshify-client.config.json";
}

let Meshes;
ipcRenderer.on("handle-config", (e, arg) => {
  // document window
  Meshes = arg;
  console.log("Meshes updated: ", Meshes);
});
let Queries = [];
ipcRenderer.on("handle-dns", (e, arg) => {
  let add = true;
  // Eliminate duplicates before it goes on the main list
  for (let i = 0; i < Queries.length; i++) {
    if (Queries[i] == arg) {
      add = false;
      break;
    }
  }
  if (add) Queries.push(arg);
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
    loginText: "Login",
    meshifyConfig: {},
    queries: [],
    meshes: [],
    mesh: null,
    meshName: "",
    myMeshes: [],
    nodes: [],
    links: [],
    nodeSize: 30,
    selected: "",
    dialogCreate: false,
    dialogSettings: false,
    meshifyHost: "",
    hostId: "",
    apiKey: "",
    oneHour: 0,
    host: null,
    valid: false,
    meshList: {},
    endpoint: "",
    listenPort: 0,
    tags: [],
    hostEnable: true,
    hostName: "",
    showChart: false,
    showDns: false,
    logged_in: false,
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
        categories: [
          "1min",
          " ",
          " ",
          45,
          " ",
          " ",
          30,
          " ",
          " ",
          15,
          " ",
          " ",
        ],
      },
      yaxis: {
        labels: {
          formatter: function (value) {
            var result = value + " bps";
            if (value >= 1000) {
              result = ((value / 1000) >> 0) + " Kbps";
            }
            if (value >= 1000000) {
              result = (value / 1000000).toFixed(1) + " Mbps";
            }
            if (value >= 1000000000) {
              result = (value / 1000000000).toFixed(1) + " Gbps";
            }
            return result;
          },
        },
      },
    },
    series: [],
    seriesInit: false,
    chart: null,
  }),
  computed: {
    addMeshDisabled() {
      return this.logged_in == false;
    },
    options() {
      return {
        force: 2000,
        size: { w: 400, h: 300 },
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
      config = JSON.parse(fs.readFileSync(MeshifyConfigPath));
    } catch (e) {
      console.error("meshify.conf does not exist: ", e.toString());
    }

    console.log("Config = ", config);
    this.meshes = config.config;

    try {
      this.meshifyConfig = JSON.parse(fs.readFileSync(MeshifyClientPath));
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
    // find the local host in a mesh and set the enable flag on the mesh
    if (this.meshes != null) {
      for (let i = 0; i < this.meshes.length; i++) {
        for (let j = 0; j < this.meshes[i].hosts.length; j++) {
          if (this.meshes[i].hosts[j].hostGroup == this.meshifyConfig.HostID) {
            this.meshes[i].enable = this.meshes[i].hosts[j].enable;
          }
        }
      }
    }

    // setInterval(loadMeshes, 1000);
    setInterval(() => {
      this.oneHour++;
      if (this.oneHour > (60 * 60) / 5) {
        // no longer authenticated
        this.LoginText = "Login";
        this.logged_in = false;

        this.oneHour = 0;
      }
      this.loadMeshes();
      this.loadQueries();
      if (this.mesh != null) {
        this.getMetrics(this, this.mesh.meshName);
      }
    }, 5000);
  },
  methods: {
    async logout() {
      ipcRenderer.send("logout");

      alert("You have been logged out");
      this.loginText = "Login";
    },
    async login() {
      if (this.loginText == "Login") {
        ipcRenderer.sendSync("authenticate");

        this.loginText = "Logout";
        this.logged_in = true;
      } else {
        this.loginText = "Login";
        this.logged_in = false;
        await this.logout();
      }
    },
    loadMeshes() {
      if (Meshes) {
        console.log("loadMeshes - Meshes = ", Meshes);
        this.meshes = Meshes;
        Meshes = null;
        console.log("loadMeshes Config = ", this.meshes);
        // find the local host in a mesh and set the enable flag on the mesh
        for (let i = 0; i < this.meshes.length; i++) {
          for (let j = 0; j < this.meshes[i].hosts.length; j++) {
            if (
              this.meshes[i].hosts[j].hostGroup == this.meshifyConfig.HostID
            ) {
              this.meshes[i].enable = this.meshes[i].hosts[j].enable;
            }
          }
        }
      }
    },
    loadQueries() {
      if (Queries) {
        for (let i = 0; i < Queries.length; i++) {
          this.queries.unshift(Queries[i]);
          if (this.queries.length > 1000) {
            this.queries.pop();
          }
          this.showDns = true;
        }
        Queries = [];
      }
    },
    launchSSH(item) {
      console.log("SSH Item: ", item);
      if (os.platform == "win32") {
        spawn("ssh", [item.name], {
          windowsHide: false,
          detached: true,
          shell: true,
        });
      } else {
        if (process.arch == "arm") {
          var child = spawn("lxterminal", ["-e", "ssh", item.name], {
            foreground: true,
            detached: true,
          });
          console.log("child = %s", child);
        } else {
          var child2 = spawn(
            "exo-open",
            ["--launch", "TerminalEmulator", "ssh", item.name],
            {
              foreground: true,
              detached: true,
              shell: true,
            }
          );
          console.log("child = %s", child2);
        }
      }
    },
    launchRDP(item) {
      console.log("RDP Item", item);
      if (os.platform == "win32") {
        spawn("mstsc.exe", ["/v:" + item.name]);
      } else {
        var child = spawn("rdesktop", ["-f", item.name]);
        console.log("child = %s", child);
      }
    },
    async startCreate() {
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
      await this.getMeshList();

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
    async stopService(meshName) {
      console.log("stopService %s", meshName);
      axios
        .delete("http://127.0.0.1:53280/service/" + meshName + "/", {
          headers: {},
        })
        .then((response) => {
          console.log("stopService response = ", response);
        });
    },
    getMetrics(that, mesh) {
      let stats;
      axios
        .get("http://127.0.0.1:53280/stats/" + mesh, {
          headers: {},
        })
        .then((response) => {
          stats = response.data;
          if (stats[mesh] == null) {
            console.log("Response did not contain a result");
          } else {
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
          }
        });
      // .catch(() => {});
      //       {
      // name: "",
      // data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      // head: 0,
      // buckets: 12,
    },
    create(host) {
      console.log("Create Host: ", host);
      // get a new keypair from the keystore for this host
      try {
        axios
          .get("http://127.0.0.1:53280/keys/", { headers: {} })
          .then((response) => {
            console.log("Public Key = ", response.data);
            host.current.publicKey = response.data.Public;
            host.current.privateKey = "";
          });
      } catch (e) {
        console.log("Error getting keypair: ", e);
      }

      this.host.name = this.hostName;
      this.host.current.endpoint = this.endpoint;
      this.host.current.listenPort = this.listenPort;
      this.host.current.listenPort = parseInt(this.host.current.listenPort, 10);
      this.host.meshName = this.meshList.selected.text;
      this.host.meshid = this.meshList.selected.value;
      this.host.hostGroup = this.meshifyConfig.HostID;
      this.dialogCreate = false;
      console.log("createHost Host = ", this.host);
      this.createHost(host);
    },
    createHost(host) {
      let accessToken = ipcRenderer.sendSync("accessToken");
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
              let host = response.data;
              console.log("Host = ", host);
              let changed = false;
              console.log("Checking meshify-client.config.json for updates");
              if (
                this.meshifyConfig.HostID == "" ||
                this.meshes == null ||
                this.meshes.length == 0
              ) {
                this.meshifyConfig.HostID = host.hostGroup;
                this.meshifyConfig.ApiKey = host.apiKey;
                changed = true;
                console.log(
                  "this.meshifyConfig changed = ",
                  this.meshifyConfig
                );
              }
              if (changed) {
                console.log("Writing new meshify-client.config.json");
                try {
                  fs.writeFileSync(
                    MeshifyClientPath,
                    JSON.stringify(this.meshifyConfig)
                  );
                  console.log(
                    "meshify-client.config.json has been updated :",
                    this.meshifyConfig
                  );
                } catch (e) {
                  console.log("Error updating config file: %s", e);
                  if (os.platform() != "win32") {
                    // If we're not on windows, try to sudo cp it
                    try {
                      fs.writeFileSync(
                        "meshify-client.config.json.tmp",
                        JSON.stringify(this.meshifyConfig)
                      );
                      spawn(
                        "sudo",
                        [
                          "mv",
                          "meshify-client.config.json.tmp",
                          MeshifyClientPath,
                        ],
                        { windowsHide: false }
                      );
                    } catch (e) {
                      {
                        console.log(
                          "Could not write meshify-client.config.json. %s",
                          e
                        );
                      }
                    }
                  }
                }
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
    async getMeshList() {
      return new Promise((resolve, reject) => {
        let accessToken = ipcRenderer.sendSync("accessToken");
        if (!accessToken) return reject(new Error("no access token available"));
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
              .get(serverUrl + "/api/v1.0/mesh", {
                headers: {
                  Authorization: "Bearer " + accessToken,
                },
              })
              .then((response) => {
                this.myMeshes = response.data;
                resolve();
              })
              .catch((error) => {
                if (error) console.error(error);
              });
          })
          .catch((error) => {
            if (error) throw new Error(error);
          });
      });
    },
    async update(mesh) {
      return new Promise((resolve, reject) => {
        console.log("Update Mesh: ", mesh);
        let accessToken = ipcRenderer.sendSync("accessToken");
        if (!accessToken) ipcRenderer.sendSync("authenticate");
        if (!accessToken) accessToken = ipcRenderer.sendSync("accessToken");
        let body = {
          grant_type: "authorization_code",
          client_id: "Dz2KZcK8BT7ELBb91VnFzg8Xg1II6nLb",
          state: accessToken,
          code: accessToken,
          redirect_uri: serverUrl,
        };
        let host = null;
        for (let i = 0; i < mesh.hosts.length; i++) {
          if (mesh.hosts[i].hostGroup == this.meshifyConfig.HostID) {
            host = mesh.hosts[i];
            break;
          }
        }
        if (host != null) {
          host.enable = !host.enable;
        } else {
          return reject(new Error("local host not found in mesh"));
        }
        axios
          .post(serverUrl + "/api/v1.0/auth/token", body, {
            headers: {
              Authorization: "Bearer " + accessToken,
            },
          })
          .then(() => {
            axios
              .patch(serverUrl + "/api/v1.0/host/" + host.id, host, {
                headers: {
                  Authorization: "Bearer " + accessToken,
                },
              })
              .then(() => {
                if (!host.enable) {
                  this.stopService(mesh.meshName);
                }
                resolve();
              })
              .catch((error) => {
                if (error) console.error(error);
              });
          })
          .catch((error) => {
            if (error) throw new Error(error);
          });
      });
    },
    startSettings() {
      this.dialogSettings = true;

      this.meshifyHost = this.meshifyConfig.MeshifyHost;
      this.hostId = this.meshifyConfig.HostID;
      this.apiKey = this.meshifyConfig.ApiKey;
    },
    saveSettings() {
      this.meshifyConfig.MeshifyHost = this.meshifyHost;
      this.meshifyConfig.HostID = this.hostId;
      this.meshifyConfig.ApiKey = this.apiKey;
      this.dialogSettings = false;
      this.saveConfig();
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
::-webkit-scrollbar-track {
  background: #444;
}
::-webkit-scrollbar-thumb {
  background: #888;
}
::-webkit-scrollbar-corner {
  background: #333;
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

h4 {
  margin: 20px;
  display: flex;
  justify-content: center;
  font-size: 18px;
}
div.chart-wrapper {
  display: flex;
  align-items: left;
  justify-content: left;
}
</style>
