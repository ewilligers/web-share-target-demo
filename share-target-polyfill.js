'use strict';

(() => {
  let method = 'manifest';

  function receiveMessage(event) {
    if (['manifest', 'GET', 'POST'].includes(event.data)) {
      method = event.data;
      return;
    }
    const manifestURL = document.querySelector('link[rel=manifest]').href;

    // console.log('Fetching manifest ' + manifestURL);
    fetch(manifestURL)
    .then((response) => {
      // console.log('Fetched manifest ' + manifestURL);
      return response.json();
    })
    .then((myJson) => {
      if (myJson.share_target && myJson.share_target.action && myJson.share_target.params) {
        const action = myJson.share_target.action;
        const shareTargetMethod = (myJson.share_target.method || '').toUpperCase();
        const params = myJson.share_target.params;
        if (method === 'POST'|| (method === 'manifest' && shareTargetMethod === 'POST')) {
          // Use XMLHttpRequest.
          const formData = new FormData();
          for (let key of ['title', 'text', 'url']) {
            if (params[key] && event.data[key]) {
              formData.append(params[key], event.data[key]);
              // console.log('params[key] ' + params[key] + ', event.data[key] ' + event.data[key]);
            }
          }

          let matched = [];
          if (params['files'] && event.data['files']) {
            for (let i = 0; i < params['files'].length; ++i) {
              for (let j = 0; j < event.data['files'].length; ++j) {
                const name = params['files'][i]['name'];
                const accept = params['files'][i]['accept'];
                const value = event.data['files'][j];
                const filename = value.name;
                const type = value.type;

                if (matched.includes(value))
                  continue;

                // this assumes that there is a single, well-formed MIME type
                const splitAccept = accept.split('/')
                const splitType = type.split('/')

                // Glob matching is not yet implemented.
                // Accepting a list is not yet implemented.
                // Matching a file against no more than one field is not yet implemented.
                if (!accept || accept === '*/*' || accept === type || (splitAccept[1] === '*' && splitAccept[0] === splitType[0])) {
                  console.log('name ' + name + ', filename ' + filename + ' (' + value.size + ' bytes), type ' + value.type);
                  formData.append(name, value, filename);
                  matched.push(value);
                }
              }
            }
          }
          if (event.data['files']) {
            for (let j = 0; j < event.data['files'].length; ++j) {
              const value = event.data['files'][j];
              const filename = value.name;
              const type = value.type;

              if (matched.includes(value))
                continue;

              console.log('No match for file ' + filename + ' with type ' + value.type);
            }
          }

          const xhr = new XMLHttpRequest();
          xhr.open("POST", action);
          // xhr.setRequestHeader("Content-Type","multipart/form-data");
          xhr.onload = function() {
            if (xhr.status !== 200) {
              console.log('XMLHttpRequest failed');
              return;
            }
            document.getElementById('target').contentWindow.document.documentElement.innerHTML = xhr.responseText;
          };
          xhr.send(formData);
        } else {
          const pairs = [];
          for (let key of ['title', 'text', 'url']) {
            if (params[key] && event.data[key]) {
              pairs.push(encodeURIComponent(params[key]) + '=' + encodeURIComponent(event.data[key]));
            }
          }
          const url = action + '?' + pairs.join('&');
          console.log('URL = "' + url + '"');
          document.getElementById('target').contentWindow.location.href = url;
        }
      }
    });
  }

  window.addEventListener("message", receiveMessage, false);
})();

