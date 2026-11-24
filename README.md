# JobFinder

A simple web app for searching job listings from around the world.

**Live site:** https://www.wanjiku.tech

**GitHub repository:** https://github.com/dwanjiku1-lgtm/Job-Finder-App

## Demo Video
[Watch the demo video](PASTE_VIDEO_LINK_HERE)


## Features
- Search jobs by keyword and country code
- Filter by job type, remote only, or keyword
- Sort by newest, oldest, or company name
- Apply through the job's link
- Results are cached for 10 minutes to save API requests

## Built With
- Node.js and Express
- HTML, CSS and JavaScript
- JSearch API
- Nginx, PM2 and HAProxy

## Project Structure
```
Job-Finder-App/
├── public/
│   ├── index.html    # Page layout
│   ├── app.js        # Search, filters and sorting
│   └── styles.css    # Styling
├── server.js         # Express server and API routes
├── package.json      # Dependencies and scripts
└── .env              # API key (you create this; never commit it)
```

## Run Locally
### Prerequisites
- Node.js 18 or newer (check with `node -v`) and npm
- Git
- A RapidAPI account

### Get an API key
1. Sign in to [RapidAPI](https://rapidapi.com).
2. Subscribe to the [JSearch API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch).
3. Copy your `X-RapidAPI-Key`.

### Install and start

```bash
git clone https://github.com/dwanjiku1-lgtm/Job-Finder-App.git
cd Job-Finder-App
npm install
```

Create a `.env` file:

```
RAPIDAPI_KEY=your_key_here
PORT=3000
```

Start the app:

```bash
npm start
```

Open http://localhost:3000, enter a job title and a two-letter country code (default `us`), then click **Search**. Press `Ctrl + C` to stop the server.

## API Endpoints
| Endpoint | Description |
|---|---|
| `GET /api/jobs?query=developer&country=us` | Search for jobs |
| `GET /health` | Check server status and name |

`query` is required. `country` is optional and defaults to `us`.

| Error status | Meaning |
|---|---|
| 400 | No search query was given |
| 500 | `RAPIDAPI_KEY` is missing |
| 502 | The request to JSearch failed or timed out |
| Other | Passed on from JSearch, such as an invalid key or request limit |

## Deployment
These steps use Ubuntu servers.

| Server | Role |
|---|---|
| 7425-web-01 | Web server |
| 7425-web-02 | Web server |
| 7425-lb-01 | Load balancer |

### Web servers (repeat on both)
1. Connect with `ssh ubuntu@<server-ip>` and install the tools:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx git
   sudo npm install -g pm2
   ```
2. Get the app, install its dependencies and add your key:
   ```bash
   git clone https://github.com/dwanjiku1-lgtm/Job-Finder-App.git
   cd Job-Finder-App
   npm install
   printf 'RAPIDAPI_KEY=your_key_here\nPORT=3000\n' > .env
   chmod 600 .env
   ```
3. Start the app:
   ```bash
   pm2 start server.js --name jobfinder
   pm2 startup   # run the command it prints
   pm2 save
   ```
4. Put this in `/etc/nginx/sites-available/default`:
   ```nginx
   server {
       listen 80 default_server;
       server_name _;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
5. Apply it: `sudo nginx -t && sudo service nginx restart`

### Load balancer
HAProxy handles HTTPS, redirects HTTP to HTTPS, and shares traffic between both web servers using round robin. It uses the `/health` route to check each server.

A file containing the SSL certificate and private key must be at `/etc/haproxy/certs/www.wanjiku.tech.pem`. In `/etc/haproxy/haproxy.cfg`, keep the `global` and `defaults` sections and configure:

```
frontend http_front
    bind *:80
    http-request redirect scheme https code 301

frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/www.wanjiku.tech.pem
    http-request set-header X-Forwarded-Proto https
    default_backend http_back

backend http_back
    option httpchk GET /health
    balance roundrobin
    server 7425-web-01 <web-01-ip>:80 check
    server 7425-web-02 <web-02-ip>:80 check
```

Check and reload:

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg && sudo service haproxy reload
```

### Updating the app
Run this on each web server:

```bash
cd ~/Job-Finder-App
git pull
npm install
pm2 restart jobfinder
```

## Testing the Load Balancer
```bash
for i in 1 2 3 4; do curl -s https://www.wanjiku.tech/health; echo; done
```

The server name in the responses should alternate between the two web servers.

### Failover test
1. On web-01, run `pm2 stop jobfinder`.
2. Wait a few seconds, then refresh the site. It should still work through web-02.
3. Run `pm2 start jobfinder` to restore web-01.




## Security
The API key is stored in `.env`, which should never be committed to GitHub.

## Credits
Job data from the [JSearch API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) by Letscrape via RapidAPI.
