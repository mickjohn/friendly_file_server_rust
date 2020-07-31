<!doctype html>

<html lang="en">

<head>
  <meta charset="utf-8">
  <title>FFS!</title>
  <meta name="description" content="Friendly File Sharer">
  <link rel="stylesheet" type="text/css" href="/static/listing.css">
</head>

<body>
   <div class="content">
    <h1>Friendly File Server</h1>
    <div class="path">
      Index of <a href="/browse">root /</a>

      {{#each listing.trail }}
      <a href="/browse/{{ urlencode this.[0] }}/">
        {{ this.[1] }} /
      </a>
      {{/each}}
    </div>

    <table>
      <tr>
        <th> Icon </th>
        <th> Name </th>
        <th> Size </th>
        <th> Modified </th>
      </tr>

      {{#each listing.children as | child |}}

      <tr>
        {{#if child.is_dir }}
        <td align="center"> <img src="/static/icons/folder_icon.svg" alt="icon" height="35"> </td>
        {{ else }}
        <td align="center"> <img src="/static/icons/{{ icon_for_ext child.name }}" alt="icon" height="35"> </td>
        {{/if }}

        <td>
          {{#if child.is_dir }}
          <a href="/browse{{@root.listing.path}}{{urlencode child.name}}">
            {{ child.name }}
          </a>
          {{ else }}
          <a href="/browse{{@root.listing.path}}{{child.name}}">
            {{ child.name }}
          </a>
          {{/if}}

          {{#if (is_mp4 child.name) }}
          <a class="cinema" href="/cinema{{@root.listing.path}}{{ child.name}}?cinema=1">
            (click here to stream)
          </a>
          {{/if }}

        </td>
        {{#if child.is_dir }}
        <td> - </td>
        {{ else }}
        <td> {{ child.size }} </td>
        {{/if }}        
        
        <td> {{ child.mtime }} </td>
      </tr>            
      {{/each}}
    </table>

  </div>
</body>

</html>
