# Docker Sandbox Cockpit

Manage your local Docker Sandboxes from one browser window. Create environments
for coding agents or Bash, reuse templates, connect services, and inspect files
and disk usage without switching between CLI commands.

Cockpit runs on your machine and uses your installed `sbx` CLI. It shows your
existing sandboxes and templates alongside any you create here.

## Get started

You'll need:

- [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) installed and running,
  with `sbx` available in your terminal.
  This version has been tested with sbx v0.46.0.
- Node.js 22.12 or newer, including npm.

Check that Docker Sandboxes is available with `sbx --help`, then install Cockpit:

```sh
npm install -g docker-sbx-cockpit
sbx-cockpit
```

Open [Cockpit](http://127.0.0.1:9876) in your browser. Keep the terminal running
while you use the app; press **Ctrl+C** there to stop serving Cockpit.

### Build from source

You can also install from this repository. This requires Git and pnpm in
addition to Node.js:

```sh
git clone https://github.com/sirknigget/docker-sbx-cockpit.git
cd docker-sbx-cockpit
npm ci
npm run build
npm start
```

### Use a different port

```sh
sbx-cockpit --port 9880
```

Then open [http://127.0.0.1:9880](http://127.0.0.1:9880). You can also set the
`PORT` environment variable; `--port` takes precedence. Cockpit listens only on
this machine, at `127.0.0.1`.

To use the `sbx-cockpit` command from any folder, run `npm link` once from the
project folder after building from source. You can also run
`npm start -- --port 9880` from that folder. Use `sbx-cockpit --help` to see its
options.

## Create your first sandbox

1. In **Sandboxes**, click **Create sandbox**.
2. Give it a name, such as `my-project`.
3. Choose a coding agent, or **Pure shell (Bash)** for a general-purpose environment.
4. Optionally add workspace mounts: one absolute path on your machine per line.
   For example, `/Users/you/projects/my-project`. Mounts are writable by default;
   append `:ro` for read-only access. Leave this field empty for no mounts.
5. Click **Create sandbox**. The first creation may take longer while Docker
   downloads the environment.
6. Click the sandbox's name to open its tools. In **Terminal**, click
   **Open terminal**, enter `pwd`, and click **Run command**.

Use **Refresh** to reload the list after changes made outside Cockpit. You can
stop or delete sandboxes from the list; both actions ask for confirmation.
Stopping keeps the sandbox for later use. Deleting removes it.

## Find your way around

| Where                    | What you can do                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Sandboxes**            | See environments, create new ones, stop them, or delete them.                                                                             |
| **Templates**            | Save a sandbox as a reusable starting point, create from a saved template, or delete a template.                                          |
| **Secrets**              | Manage service and registry credentials, and custom secrets from values or 1Password/AWS Secrets Manager references.                      |
| Sandbox → **Ports**      | Publish a sandbox service to your machine or remove a published port. Leave the host port empty to choose an available one automatically. |
| Sandbox → **Files**      | Browse folders and open text files in a scrollable viewer.                                                                                |
| Sandbox → **Disk usage** | See free space and the largest folders. Enter a folder's path to inspect it more closely.                                                 |
| Sandbox → **Terminal**   | Run Bash commands in a session that remembers your working directory and variables.                                                       |

### Reuse an environment

Install the tools you need in a sandbox, then stop it. In **Templates**, click
**Save template**, select the stopped sandbox, and give the template a reference
such as `my-tools:v1`. Click **Create sandbox** on its card to reuse it.

Templates include changes inside the sandbox's filesystem. Workspace mounts and
published ports aren't included, so configure those for each new sandbox.

### Connect services and credentials

Use **Ports** to make a service running inside a sandbox available to your
machine. Choose the sandbox's service port, a host port, and the protocol your
service uses; TCP is the usual choice for web servers.

In **Secrets**, choose whether a credential applies globally, to a host, or to a
sandbox. Stored secret values aren't shown back to you. When deleting registry
credentials for a host, review the confirmation: this also removes the global
credential for that registry.

## Things to know

- Browsing files, checking disk usage, publishing ports, or opening a terminal
  can start a stopped sandbox.
- The file viewer opens UTF-8 text files up to 1 MiB. Binary files and symbolic
  links aren't supported. Folder listings show up to 500 entries.
- Disk scans show the largest immediate subfolders on the current filesystem.
  A scan can return partial results if some folders can't be read.
- The terminal supports Bash commands, but not full-screen interactive programs
  such as `vim` or `top`. Close the terminal to end a running command. Sessions
  expire after 15 minutes without input.
- File and disk tools work with the standard Linux utilities in the built-in
  sandbox environments. Custom templates may need those utilities installed.

## Troubleshooting

| Problem                                                     | Try this                                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Cockpit can't find `sbx`                                    | Run `sbx --help` in the same terminal used to start Cockpit. Make sure the CLI is installed and on your PATH, then restart Cockpit.  |
| Docker reports an unavailable service or a download failure | Check that Docker Sandboxes is running and that your network can reach the image registry. The app displays the CLI's error message. |
| Port 9876 is already in use                                 | Start with `sbx-cockpit --port 9880` and open that address instead.                                                                  |
| A sandbox changed elsewhere but the list looks outdated     | Click **Refresh**.                                                                                                                   |
| A command timed out                                         | Refresh and check the sandbox before retrying; the operation may already have taken effect.                                          |
