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
            <button @click="loadMeshes()" class="btn btn-primary my-2 my-sm-0">
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
    <v-simple-table>
      <tbody>
        <tr>
          <td>
            <div class="row" id="exp">
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
                    <d3-network
                      class="network"
                      :net-nodes="nodes"
                      :net-links="links"
                      :options="options"
                    />
                    <v-data-table
                      dark
                      :headers="headers"
                      :items="mesh.hosts"
                      :search="search"
                    />
                  </v-expansion-panel-content>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </td>
        </tr>
      </tbody>
    </v-simple-table>
  </div>
</template>
<script>
const { remote } = window.require("electron");
const axios = require("axios");
const fs = window.require("fs");
const D3Network = window.require("vue-d3-network");

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
    ],
    meshes: [],
    todos: [],
    nodes: [],
    links: [],
    nodeSize: 50,
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
      let config = JSON.parse(
        fs.readFileSync("c:\\ProgramData\\Meshify\\Meshify.conf")
      );
      console.log("Config = ", config);
      this.meshes = config.config;
    },
    fetchTodos() {
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
              this.todos = response.data;
              this.meshes = response.data;
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
      let mesh;
      let mesh_hosts = [];
      for (let i = 0; i < this.meshes.length; i++) {
        if (this.meshes[i].meshName == name) {
          mesh = this.meshes[i];
          break;
        }
      }
      for (let i = 0; i < mesh.hosts.length; i++) {
        if (mesh.hosts[i].meshName == name) {
          mesh_hosts[x] = mesh.hosts[i];
          this.nodes[x] = {
            id: x,
            name: mesh.hosts[i].name /* _color:'gray'*/,
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
  display: none;
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
.link {
  color: white;
}
.net-svg {
  margin: 0 auto;
}
.network {
  display: flex;
  justify-content: center;
}
</style>
