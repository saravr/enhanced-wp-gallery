(function() {
    var shortcode = 'egallery';

    tinymce.PluginManager.add(shortcode, function( editor, url ) {

        function updateGalleryItem (url, caption, gid, id) {

            var imgId = gid + '-img-' + id;
            var captionId = gid + '-caption-' + id;

            var content = tinyMCE.activeEditor.getContent();
            tinyMCE.activeEditor.setContent(content);

            jQuery("#" + imgId).attr('src', url);
            jQuery("#" + captionId).html(caption);
        }

        function getGalleryItem (url, caption, gid, id) {

            if (url === undefined) {
                url = "#";
            }
            if (caption === undefined) {
                caption = "";
            }

            var imgId = gid + '-img-' + id;
            var captionId = gid + '-caption-' + id;

            var output = '<dl class="gallery-item">';
            output += '<dt class="gallery-icon">';
            output += '<img id="' + imgId + '" src="' + url + '"/>';
            output += '</dt>';
            output += '<dd id="' + captionId + '" class="wp-caption-text gallery-caption">';
            output += caption;
            output += '</dd></dl>';
            return output;
        }

        function addMedia (gid, ids) {

            var output = '';
            for (i = 0; i < ids.length; i++) {
                var id = ids[i];

                var att = new wp.media.attachment(id);
                var url = att.get('url');
                output += getGalleryItem(url, att.get('caption'), gid, id);

                if (url === undefined) {
                    var cb = function(att) {
                        return updateGalleryItem(
                            att.get('url'), att.get('caption'), gid, id);
                    };
                    att.fetch({success:cb});
                }
            }

            return output;
        }

        function html (all, data) {

            var encodedData = window.encodeURIComponent(all);

            var dt = Date.now();
            var gid = "gl2-id-" + dt;
            var output = '<div class="wpview-wrap" data-wpview-text="' + encodedData + '" data-wpview-type="gallery" data-mce-selected="1">';
            output += '<p class="wpview-selection-before">&nbsp;</p>';
            output += '<div class="wpview-body" contenteditable="false">';
            output += '<div class="wpview-content wpview-type-gallery">';
            output += '<div class="gallery gallery-columns-1" id="' + gid + '">';

            data = data.trim();
            data = data.replace(/['"]+/g, '');
            var ids = data.split(",");
            output += addMedia(gid, ids);

            output += '<br style="clear: both;">';
            output += '</div>';
            output += '</div>';
            output += '<div class="wpview-clipboard" contenteditable="true">' + all + '</div>';
            output += '</div>';
            output += '<p class="wpview-selection-after">&nbsp;</p>';
            output += '</div>';

            return output;
        }

        function replaceShortcodes (content) {

            // TBD: dont hardcode shortcode below
            return content.replace(/\[egallery ids=([^\]]*)\]/g,
                function (all, attrs) {
                    return html(all, attrs);
                }
            );
        }

        editor.on('BeforeSetcontent', function(event) {

            event.content = replaceShortcodes(event.content);
        });
    })
})();
