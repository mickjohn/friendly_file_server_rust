<!doctype html>

<html lang="en">

<head>
  <meta charset="utf-8">
  <title>FFS!</title>
  <meta name="description" content="Friendly File Sharer">
  <link rel="stylesheet" type="text/css" href="/static/listing.css">
</head>

<body>
  <header>
    <a href="/browse/"><h2>Mickjohn.com</h2></a>
  </header>
  <div class="content">
    <div class="path">
      <span id="crumbtrail">Index of <a href="/browse/">root /</a></span>

      {{#each listing.trail }}
      <a href="/browse/{{ urlencode this.[0] }}/">
        {{ this.[1] }} /
      </a>
      {{/each}}
    </div>

    <table>
      <tr>
        <th class="file-name" colspan="2"> Name </th>
        <th class="file-mtime"> Modified </th>
        <th class="file-size"> Size </th>
      </tr>

      {{#each listing.children as | child |}}

      <tr>
        {{#if child.is_dir }}
        <td align="center"> <img src="/static/icons/folder_icon.svg" alt="icon" height="35"> </td>
        {{ else }}
        <td align="center"> <img src="/static/icons/{{ icon_for_ext child.name }}" alt="icon" height="35"> </td>
        {{/if }}

        <td class="file-name">
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
          <a class="cinema" href="/static/cinema?video=/browse{{@root.listing.path}}{{child.name}}">
            (click here to stream)
          </a>
          {{/if }}

          <div class="small-screen-only">
            <span class="small-file-mtime"><b>Modified:</b> <i>{{ child.mtime }}</i></span>
            {{#unless child.is_dir }}
            <span class="small-file-size"><b>Size: {{ child.size }}</b></span>
            {{/unless }}
          </div>
        </td>

        <td class="file-mtime"> {{ child.mtime }} </td>

        {{#if child.is_dir }}
        <td class="file-size"> - </td>
        {{ else }}
        <td class="file-size"> {{ child.size }} </td>
        {{/if }}

      </tr>
      {{/each}}
    </table>

  </div>
</body>

</html>
