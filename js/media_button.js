jQuery(function($) {
    var url = ewg_data.ajax_url;
    var shortcode = 'egallery'; // TBD replace shortcodes below

    $(document).ready(function(e){
        $('#insert-my-media').click({mode: 'new'}, open_media_window);

        jQuery(document).off('click', '.dashicons-edit');
        jQuery(document).on('click', '.dashicons-edit', {mode: 'edit'}, open_media_window);

        jQuery(document).off('click', '.dashicons-no');
        jQuery(document).on('click', '.dashicons-no', delete_gallery);
    });

    var delete_gallery = function (e) {

        var textArea = jQuery('#wpwrap textarea'); // TBD -- handle > 1 gallery
        var text = textArea.html();

        var regex = /\[egallery ids=([^\]]*)\]/;
        var matches = regex.exec(text);
        if (matches !== null && matches.length > 1) {
            var gallery = matches[0];

            var contents = tinyMCE.activeEditor.getContent();
            contents = contents.replace(gallery, "");
            console.log('Removing gallery: ' + gallery);
            tinyMCE.activeEditor.setContent(contents);
        }
    }

    function sendSelection (mdata, object, callback) {

        var sel_msg = {
            'action': 'coll_info',
            'postid': ewg_data.post_id,
            'mdata': mdata
        };

        jQuery.post(url, sel_msg, function(response) {
            console.log('Sent selection - response: ' + response);
            var resp = JSON.parse(response);
            console.log('STATUS: ' + resp.status);
            console.log('IDLIST: ' + resp.idlist);
            callback(resp.idlist, object);
        });
    }

    var open_media_window = function (e) {

        console.log('OPEN MEDIA WINDOW ...');

        var idlist = [];

        this.galleryMode = e.data.mode;
        if (this.galleryMode === "edit") {
            var textArea = jQuery('#wpwrap textarea'); // TBD -- handle > 1 gallery
            var content = textArea.html();
            this.galleryContents = content;
            var regex = /\[egallery ids=([^\]]*)\]/;
            var matches = regex.exec(content);
            if (matches !== null && matches.length > 1) {
                var data = matches[1].replace(/['"]+/g, '');
                idlist = data.split(",");
            }
        }

        //if (this.window === undefined) {
            this.window = wp.media({
                title: 'Select images for gallery',
                library: {type: 'image'},
                multiple: 'add',
                button: {text: 'Create Gallery'}
            });

            var self = this;

            showSavedSelection(idlist, this);
            console.log('Setting select handler ...');
            this.window.on('select', function(arg) { selectHandler(self); });
        //}

        this.window.open();
        return false;
    }

    var selectHandler = function (object) {

        console.log('Select handler invoked ... ');
        var dt = Date.now();
        var backid = 'ewg-back-' + dt;
        var backtag = '#' + backid;
        var submitId = 'ewg-submit-' + dt;
        var submitTag = '#' + submitId;
        var titlePfx = 'ewg-title-' + dt;
        var captionPfx = 'ewg-caption-' + dt;

        console.log('BACKTAG: ' + backtag);
        var panel = jQuery('<div id="newgl" style="padding-top:40px;overflow-y:scroll;height:100%;background:white;"></div>');
        panel.append("<hr style='clear:left;'/>");

        var list = object.window.state().get('selection').toJSON();
        var idlist = [];
        for (i = 0; i < list.length; i++) {
            var id = list[i].id;
            idlist.push(id);

            var ida = "<div style='margin-left:40px;resize:vertical;overflow:auto;'>";

            titleId = titlePfx + '-' + id;
            captionId = captionPfx + '-' + id;

            var url = list[i].sizes.thumbnail.url;
            ida += '<div style="height:160px;width:160px;margin-top:20px;margin-right:40px;float:right;"><img style="max-width:100%;max-height:100%;" src="' + url + '"/></div>';
            ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Title</b></label></div><br/><input id=" + titleId + " style='width:100%' type='text' value=" + list[i].title + "/></div>";
            ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Caption</b></label></div><br/><textarea id=" + captionId + " style='width:100%;' row=3>" + list[i].caption + "</textarea></div>";
            ida += "</div>";
            ida += "<hr style='margin-top:10px;margin-left:40px;'/>";
            panel.append(ida);
        }
        panel.append("<hr style='clear:left;'/>");
        panel.append("<div style='margin-top:10px;margin-bottom:10px;padding-bottom:40px;'><button id='" + backid + "' style='float:right;'>Back</button><button style='float:right;' id='" + submitId + "'>Insert Gallery</button></div>");
        console.log('User selected ids: ' + idlist);

        jQuery(".media-modal-content").replaceWith(panel);
        console.log('Setting back handler with idlist: ' + idlist);
        jQuery(backtag).off('click');
        jQuery(backtag).click(function(e) { backHandler(idlist, object); });
        //jQuery("#newgl").on('click', backtag, function(e) { backHandler(idlist, object); });

        jQuery(submitTag).off('click');
        jQuery(submitTag).click(function(e) { submitHandler(dt, idlist, object); });

        object.window.open();
    }

    var submitHandler = function (dt, idlist, object) {

        var mdata = [];
        for (i = 0; i < idlist.length; i++) {
            var id = idlist[i];

            var titleId = 'ewg-title-' + dt + '-' + id;
            var title = jQuery("#" + titleId).val();
            console.log(dt + ": title: " + title);

            var captionId = 'ewg-caption-' + dt + '-' + id;
            var caption = jQuery("#" + captionId).val();
            console.log(dt + ": caption: " + caption);

            mdata.push({"att": id, "title": title, "caption": caption});
        }

        sendSelection(mdata, object, function(idlist, object) {

            var gallerySC = '[egallery ids="' + idlist + '"]';
            console.log('GALLERY SC: ' + gallerySC);
            if (object.galleryMode === "new") {
                wp.media.editor.insert(gallerySC);
            } else {
                var contents = tinyMCE.activeEditor.getContent();
                contents = contents.replace(object.galleryContents, gallerySC);
                tinyMCE.activeEditor.setContent(contents);
            }
        });

        object.window.close();
        return false;
    }

    var backHandler = function (idlist, object) {

        console.log('Back handler invoked with idlist: ' + idlist);

        object.window.close();
        object.window = wp.media({
                        title: 'Select images for gallery',
                        library: {type: 'image'},
                        multiple: 'add',
                        button: {text: 'Create Gallery'}
        });

        console.log('Setting select handler ...');
        object.window.on('select', function(arg) { selectHandler(object); });
        showSavedSelection(idlist, object);
        object.window.open();
    }

    var showSavedSelection = function (idlist, object) {

        console.log('Setting OPEN handler with idlist: ' + idlist);
        if (idlist === undefined) {
            return;
        }

        //var self = object;
        var callback = function () {
            console.log('Showing saved selection with idlist: ' + idlist);
            var selection = object.window.state().get('selection')
            for (i = 0; i < idlist.length; i++) {
                console.log('Preselecting id: ' + idlist[i]);
                var attachment = wp.media.attachment(idlist[i]);
                attachment.fetch();
                selection.add(attachment);
            }
        }

        object.window.on('open', callback);
    }
});
