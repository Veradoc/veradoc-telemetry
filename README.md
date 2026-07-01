# veradoc-telemetry
Veradod Telemetry with Cloudflare Workers

## Create Worker
We are going to create a worker(like AWS lambda, Azure Functions) in Cloudflare to serve a simple telemetry endpoint used by Veradoc web scripts to send info about deployment. Steps 

Before install the Cloudflare CLI, create a new account in Cloudflare

- **STEP01**: Install Cloudflare CLI
Wrangler is the CLI for the Cloudflare Developer Platform.

 ```shell
$ npm install -g wrangler
 ```

- **STEP02**: Login into Cloudflare account
```shell
$ wrangler login
```

- **STEP03**: Init a new Cloudflare project from template in your computer, prepared to be implemented and deploy.
```shell
$ wrangler init veradoc-telemetry
⛅️ wrangler 4.106.0
────────────────────
🌀 Running npm create cloudflare veradoc-telemetry --...
Need to install the following packages:
create-cloudflare@2.70.7
Ok to proceed? (y) y

npx
create-cloudflare veradoc-telemetry

👋 Welcome to create-cloudflare v2.70.7!
🧡 Let's get started.
📊 Cloudflare collects telemetry about your usage of Create-Cloudflare.

Learn more at: https://github.com/cloudflare/workers-sdk/blob/main/packages/create-cloudflare/telemetry.md

╭ Create an application with Cloudflare Step 1 of 3
│
├ In which directory do you want to create your application?
│ dir ./veradoc-telemetry
│
╰ What would you like to start with? 
  ● Hello World example  <-- Select this template. A simple Cloudflare template
  ○ Framework Starter 
  ○ Application Starter 
  ○ Template from a GitHub repo
Which template would you like to use? 
  ● Worker only <-- Select this option: One simple endpoint
  ○ Static site 
  ○ SSR / full-stack app 
  ○ Worker + Durable Objects 
  ○ Worker + Durable Objects + Assets 
  ○ Workflow 
  ○ Scheduled Worker (Cron Trigger) 
  ○ Queue consumer & producer Worker 
  ○ API starter (OpenAPI compliant) 
╭ Configuring your application for Cloudflare Step 2 of 3
│
├ Retrieving current workerd compatibility date
│ compatibility date 2026-06-30
│
╰ You're in an existing git repository. Do you want to use git for version control? 
  Yes / No <-- Select Yes
Deploy with Cloudflare Step 3 of 3
│
╰ Do you want to deploy your application? 
  Yes / No <-- Select Yes to be deployed just now a simple worker. Later we set implementation for our worker
SUCCESS  Application created successfully!

💻 Continue Developing
Change directories: cd veradoc-telemetry
Deploy: npm run deploy

📖 Explore Documentation
https://developers.cloudflare.com/workers

🐛 Report an Issue
https://github.com/cloudflare/workers-sdk/issues/new/choose

💬 Join our Community
https://discord.cloudflare.com
```

Now We can check this simple worker like this:
```shell
$ curl https://veradoc-telemetry.veradocai.workers.dev
Hello World!
```

- **STEP04**: implement the Cloudflare Worker using javascript in a file called `index.js`. Go to src/index.js and set this code for your worker.
Set the original worker implementation set the file index.js from project just scaffolded:

```shell
$ cd veradoc-telemetry

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json().catch(() => ({}));

    const key = `install_${Date.now()}_${crypto.randomUUID()}`;
    await env.TELEMETRY.put(key, JSON.stringify({
      ...body,
      ip_country: request.cf?.country ?? "unknown",
      ts: new Date().toISOString()
    }));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders() }
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
```

- **STEP05**: create a KV (Key/value) Cloudflare

Execute this command to create in Cloudflare the KV(Key/Value Database) Namespace called `TELEMETRY` where save all telemetry events sent by Veradoc post deployments. The result
also told us that we must copy and paste the `kv_namespaces` inside wrangler.jsonc file.

```shell
$ wrangler kv:namespace create TELEMETRY

⛅️ wrangler 4.106.0
────────────────────
Resource location: remote 

🌀 Creating namespace with title "TELEMETRY"
✨ Success!
To access your new KV Namespace in your Worker, add the following snippet to your configuration file:
{
  "kv_namespaces": [
    {
      "binding": "TELEMETRY",
      "id": "25b5bdf25aaf4abbb3f93def17f3f895"
    }
  ]
}
? Would you like Wrangler to add it on your behalf? › (Y/n) <-- Y
? For local dev, do you want to connect to the remote resource instead of a local resource?  <-- N
```

Edit the the file `wrangler.jsonc` updated and check this configuration file has the `kv_namespaces` argument where bind the KV Database with our worker called `veradoc-telemetry` just deployed

```shell
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "veradoc-telemetry",
	"main": "src/index.js",
	"compatibility_date": "2026-06-30",
	"observability": {
		"enabled": true
	},
	"upload_source_maps": true,
	"compatibility_flags": [
		"nodejs_compat"
	],
	"kv_namespaces": [
		{
			"binding": "TELEMETRY",
			"id": "25b5bdf25aaf4abbb3f93def17f3f895"
		}
	]
    ...
}    
```

- **STEP06**: Redeploy Cloudflare Worker

```shell
$ npm run deploy

veradoc-telemetry@0.0.0 deploy
wrangler deploy

 ⛅️ wrangler 4.106.0
────────────────────
Total Upload: 1.13 KiB / gzip: 0.59 KiB
Worker Startup Time: 6 ms
Your Worker has access to the following bindings:
Binding                                               Resource          
env.TELEMETRY (25b5bdf25aaf4abbb3f93def17f3f895)      KV Namespace      

Uploaded veradoc-telemetry (11.37 sec)
Deployed veradoc-telemetry triggers (6.75 sec)
  https://veradoc-telemetry.veradocai.workers.dev
Current Version ID: b8dbe0a1-2b42-4e3a-bf92-9912164ee0e0
```

- **STEP06**: Check the Cloudflare Worker with a simulated event

Persist a Veradoc event deployment simulated from curl
```shell
$ curl -X POST https://veradoc-telemetry.veradocai.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"event":"install","version":"1.0.0","os":"windows","gpu":"nvidia"}'
```

Check if this event was persisted in the KV Namespace TELEMETRY and get the event list:
```shell
$ wrangler kv key list --binding TELEMETRY --remote
```

Get the details the event just persisted:
```shell
$ wrangler kv key get --binding TELEMETRY "install_xxxxx" --remote
```

## Veradoc observability

Telemetry object:

- **Event type**: install or update Veradoc deployment process.
- **Country**: country where is installed Veradoc.
- **Version**: Veradoc version deployed.
- **System Operator**: the system operator used to deploye Veradoc: linux, windows
- **GPU**: if the installation used or not GPU.
- **Timestamp**: when is deployed Veradoc.

To access to these observability go to:

https://dash.cloudflare.com/499dbe0cd22d5eda9057371a4d363bf1/workers/kv/namespaces/25b5bdf25aaf4abbb3f93def17f3f895

![Veradoc Observability](./images/cloudflare-telemetry.png "Veradoc Observability")

## Cost Cloudflare Worker
Workers are free up to 100k requests/day, KV free up to 100k reads/day. For VeraDoc is enough for years.