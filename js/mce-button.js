(function() {
    var shortcode = 'egallery';

    tinymce.PluginManager.add(shortcode, function( editor, url ) {

        var beforeSetHandler = function(event) {

            event.content = replaceShortcodes(event.content);
        };

        var clickThis = function(event) {
            dashEdit = jQuery('.dashicons-edit');
            if(event.target.className == "galery-image-this"
                || event.target.className == "wpview wpview-wrap gallery-section-this"
                || event.target.className == "gallery-item"
                || event.target.parentNode.className == "wp-caption-text gallery-caption"
            ){
                dashEdit.addClass('dashicons-edit-galery');
                dashEdit.parent('button').addClass('yourClass');
                jQuery('.dashicons-no').addClass('dashicons-no-galery');
            } else {
                dashEdit.removeClass('dashicons-edit-galery');
                dashEdit.parent('button').removeClass('yourClass');
                jQuery('.dashicons-no').removeClass('dashicons-no-galery');
            }
        };

        function updateGalleryItem (url, caption, gid, id) {

            console.log('Received media info for ID: ' + id);
            id = id.trim();
            var imgId = gid + '-img-' + id;
            var captionId = gid + '-caption-' + id;

            var content = tinyMCE.get("content").getContent();
            tinyMCE.get("content").setContent(content + "DEADBEEF");

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

            id = id.trim();
            var imgId = gid + '-img-' + id;
            var captionId = gid + '-caption-' + id;

            var output = '<dl class="gallery-item">';
            output += '<dt class="gallery-icon">';
            output += '<img id="' + imgId + '" class="galery-image-this" src="' + url + '"/>';
            output += '</dt>';
            output += '<dd id="' + captionId + '" class="wp-caption-text gallery-caption">';
            output += caption;
            output += '</dd></dl>';
            output += '<br style="clear: both;">';
            return output;
        }

        function addMedia (gid, ids, ind) {

            console.log('Adding media to the gallery display ...');
            var output = '';
            for (i = 0; i < ids.length; i++) {
                var id = ids[i].trim();
                var att = new wp.media.attachment(id);
                var url = att.get('url');
                output += getGalleryItem(url, att.get('caption'), gid, id);

                if (!ind.endsWith("DEADBEEF")) /*(ind !== "</p>DEADBEEF")*/ {
                //if (url === undefined) {
                    console.log('Media info not available yet for id: ' + id + ', req aysncly');
                    (function(attx, gidx, idx) {
                        var cb = function(att) {
                            return updateGalleryItem(
                                attx.get('url'), attx.get('caption'), gidx, idx);
                        };
                        att.fetch({success:cb});
                    })(att, gid, id);
                //}
                }
            }

            return output;
        }

        function html (all, data, ind) {

            var encodedData = window.encodeURIComponent(all);

            var dt = Date.now();
            var gid = "gl2-id-" + dt;
            var output = '<div class="wpview wpview-wrap gallery-section-this" style="z-index: 1000" data-wpview-text="' + encodedData + '" data-wpview-type="gallery" contenteditable="false" data-mce-selected="1">';
            output += '<div onclick="galleySectionClick(1)" class="gallery gallery-columns-1" id="' + gid + '">';

            data = data.trim();
            data = data.replace(/['"]+/g, '');
            var ids = data.split(",");
            output += addMedia(gid, ids, ind);

            output += '</div>';
            output += '<span class="wpview-end"></span>';
            output += '</div>';

            return output;
        }

        function replaceShortcodes (content) {

            // TBD: dont hardcode shortcode below
            return content.replace(/\[egallery ids=([^\]]*)\](.*)/g,
                function (all, attrs, ind) {
                    all = all.replace(/DEADBEEF$/, '');
                    return html(all, attrs, ind);
                }
            );
        }

        editor.on('BeforeSetcontent', beforeSetHandler);
        editor.on('Click', clickThis);
    })
})();

/**
 * add own modal with "onmouseover" event
 */
jQuery("#tmpl-media-modal").after(' <script type="text/html" id="tmpl-media-modal">' +
    ' <div class="media-modal wp-core-ui"> <button type="button" ' +
    'class="button-link media-modal-close"><span class="media-modal-icon">' +
    '<span class="screen-reader-text">Close media panel</span></span></button> ' +
    '<div class="media-modal-content tester" onmouseover="initThisElement(this)"></div> </div> <div class="media-modal-backdrop"></div> </script>');

/**
 * Remove standart modal
 */
jQuery("#tmpl-media-modal").remove();

modalGlobal = 1;

function initThisElement(element){
    if(modalGlobal == 1){
        modalGlobal = jQuery(element);
    }
}

jQuery("#insert-my-media").on('click', function() {
    if(typeof  modalGlobal.removeClass != "undefined" &&  modalGlobal.removeClass != 1){
        modalGlobal.removeClass('media-modal-content');
    }
});

jQuery("#insert-media-button").on('click',function() {
    if(typeof  modalGlobal.removeClass != "undefined" &&  modalGlobal.removeClass != 1){
        modalGlobal.addClass('media-modal-content');
    }
});

