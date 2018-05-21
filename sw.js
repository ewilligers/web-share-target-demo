'use strict';

(() => {

let handleClientSide = true;

// Promise-based version of FileReader.readAsText.
function readAsTextPromise(fileReader, blob, encoding) {
  return new Promise(resolve => {
    fileReader.onload = e => resolve(e.target.result);
    fileReader.readAsText(blob, encoding);
  });
}

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  // Ideally, share-target-destination.template.html would be cached in advance.
  function respondToShare(event) {
    event.respondWith((async () => {
      const response = await fetch('share-target-destination.template.html');
      const page = await response.text();
      const formData = await event.request.formData();
      const title = formData.get('received_title') || '';
      const text = formData.get('received_text') || '';
      const url = formData.get('received_url') || '';

      const init = {
        status: 200,
        statusText: 'OK',
        headers: {'Content-Type': 'text/html'}
      };

      let body = page.replace('{{generation_location}}', 'client-side')
                     .replace('{{received_title}}', title)
                     .replace('{{received_text}}', text)
                     .replace('{{received_url}}', url);

      const file_fields = ['received_html_files', 'received_css_files'];

      let field_index = 0;

      let files = undefined;
      let file_contents = '';
      let index = 0;

      function prepareField() {
        files = formData.getAll(
            file_fields[field_index]);  // sequence of File objects
        file_contents = '';
        index = 0;
      }

      prepareField();

      async function progress() {
        while (index === files.length) {
          body = body.replace(
              '{{' + file_fields[field_index] + '}}', file_contents);

          ++field_index;
          if (field_index === file_fields.length) {
            return new Response(body, init);
          }
          prepareField();
        }

        const fileReader = new FileReader();
        const textFromFileLoaded =
            await readAsTextPromise(fileReader, files[index], 'UTF-8');
        if (index > 0) {
          file_contents += ', ';
        }
        file_contents += textFromFileLoaded;
        index += 1;
        return await progress();
      }

      return await progress();
    })());
  }

  // console.log('Received fetch event: ' + event.request.method + ' ' + event.request.url);
  if (event.request.method === 'POST') {
    const url = event.request.url;
    if (url.endsWith('/client')) {
      handleClientSide = true;
      event.respondWith(
        fetch('share-target-destination.template.html'));
      return;
    } else if (url.endsWith('/server')) {
      handleClientSide = false;
      event.respondWith(
        fetch('share-target-destination.template.html'));
      return;
    } else if (handleClientSide) {
      respondToShare(event);
      return;
    }
  }
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

})();
