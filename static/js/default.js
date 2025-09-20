// Trigger #timestamp-default
const timeDefault = document.getElementById('timestamp-default');
if (timeDefault) {
    timeDefault.addEventListener('click', async(e) => {
        e.preventDefault();

        const response = await fetch('/api/1451001600000', {
            method: 'GET'
        });

        const result = await response.json();
        const container = document.getElementById('timestamp-default-container');
        if (result) {
            container.textContent = JSON.stringify(result, null, 2);
        }
    });
}

// Trigger #timestamp-submit
const timeSubmit = document.getElementById('timestamp-submit');
if (timeSubmit) {
    timeSubmit.addEventListener('click', async(e) => {
        e.preventDefault();
        const time = document.getElementById('time').value;
        if (!time || time == null) {
            return;
        }

        const response = await fetch(`/api/${time}`, {
            method: 'GET'
        });
        const container = document.getElementById('timestamp-container');

        try {
            const result = await response.json();
            container.textContent = JSON.stringify(result, null, 2);
        } catch(err) {
            console.error(err.message);
            container.textContent = JSON.stringify({ error: 'Invalid request.' }, null, 2);
        }
    });
}

// Trigger automatically
async function preloadParser() {
    const container = document.getElementById('parser-container');
    const response = await fetch('/api/whoami', {
        method: 'GET'
    });

    try {
        const result = await response.json();
        container.textContent = JSON.stringify(result);
    } catch(err) {
        console.error(err.message);
        container.textContent = JSON.stringify({ error: 'Invalid request.' });
    }
}
document.addEventListener('DOMContentLoaded', preloadParser);

// Trigger #url-submit
const urlSubmit = document.getElementById('url-submit');
if (urlSubmit) {
    urlSubmit.addEventListener('click', async(e) => {
        e.preventDefault();

        const alertDetect = document.getElementById('url-json');
        if (alertDetect) {
            alertDetect.remove();
        }

        const data = {
            url: document.getElementById('url').value
        }

        const response = await fetch('/api/shorturl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        const message = document.querySelector('.url-message-container');
        const container = document.getElementById('url-container');
        if (result) {
            container.textContent = JSON.stringify(result);

            if (result.short_url != null) {
                const alert = document.createElement('div');
                alert.id = 'url-json';
                alert.className = 'alert alert-success fade show';
                alert.innerHTML = `You can click <a href="/api/shorturl/${result.short_url}" class="text-decoration-none" target="_blank">here</a> to visit.`;

                message.appendChild(alert);
            } else {
                const alert = document.createElement('div');
                alert.id = 'url-json';
                alert.className = 'alert alert-danger fade show';
                alert.innerHTML = `An error has occured. ${result.error}`;

                message.appendChild(alert);
            }
        }
    });
}


// Trigger #username-submit
const userSubmit = document.getElementById('username-submit');
    if (userSubmit) {
    userSubmit.addEventListener('click', async(e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        if (!username || username == null) {
            return;
        }

        const data = {
            username: username
        }

        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        const container = document.getElementById('user-container');
        const user_log = document.getElementById('user-log');
        if (result) {
            container.textContent = JSON.stringify(result, null, 2);

            if (result._id != null) {
                user_log.innerHTML = `View your logs <strong><a href="/api/users/${result._id}/logs" target="_blank" class="text-decoration-none">here</a></strong>.`;
            }
        }
    });
}

// Trigger #exercise-submit
const exerciseSubmit = document.getElementById('exercise-submit');
if (exerciseSubmit) {
    exerciseSubmit.addEventListener('click', async(e) => {
        e.preventDefault();

        const id = document.getElementById('uid').value;
        const data = {
            description: document.getElementById('description').value,
            duration: document.getElementById('duration').value,
            date: document.getElementById('date').value
        }

        const response = await fetch(`/api/users/${id}/exercises`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        const container = document.getElementById('exercise-container');
        if (result) {
            container.textContent = JSON.stringify(result, null, 2);
        }
    });
}

// Trigger #file-submit
const fileSubmit = document.getElementById('file-submit');
if (fileSubmit) {
    fileSubmit.addEventListener('click', async(e) => {
        e.preventDefault();

        const file = document.getElementById('upfile');
        if (!file.files || !file.files.length) {
            return;
        }

        const data = new FormData();
        data.append('upfile', file.files[0]);

        const response = await fetch('/api/fileanalyse', {
            method: 'POST',
            body: data
        });

        const result = await response.json();
        const container = document.getElementById('file-container');
        if (result) {
            container.textContent = JSON.stringify(result);
        }
    });
}