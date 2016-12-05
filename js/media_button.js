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

    var extractGallery = function (contents) {

        var regex = /\[egallery ids=([^\]]*)\]/;
        var matches = regex.exec(contents);
        if (matches !== null && matches.length > 0) {
            return matches[0];
        }

        return '';
    }

    var delete_gallery = function (e) {

        var contents = tinyMCE.activeEditor.getContent();
        var gallery = extractGallery(contents);

        contents = contents.replace(gallery, "");
        console.log('Removing gallery: ' + gallery);
        tinyMCE.activeEditor.setContent(contents);
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
            var contents = tinyMCE.activeEditor.getContent();
            console.log('EDIT: Original contents: ' + contents);
            var content = extractGallery(contents);
            this.galleryContents = content;
            var regex = /\[egallery ids=([^\]]*)\]/;
            var matches = regex.exec(content);
            if (matches !== null && matches.length > 1) {
                var data = matches[1].replace(/['"]+/g, '');
                idlist = data.split(",");
            }
        }

        this.window = wp.media({
                title: 'Select images for gallery',
                library: {type: 'image'},
                multiple: 'add',
                button: {text: 'Create Gallery'}
        });

        var self = this;

        if (this.galleryMode === "edit") {
            console.log('Showing select window ...');
            this.window.open();
            selectHandler(self, idlist);
        } else {
            showSavedSelection(idlist, this);
            console.log('Setting select handler ...');
            this.window.on('select', function(arg) { selectHandler(self); });
            this.window.open();
        }

        return false;
    }

    var selectHandler = function (object, idlist) {

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

        if (idlist === undefined) {
            var list = object.window.state().get('selection').toJSON();
            idlist = [];
            for (i = 0; i < list.length; i++) {
                var id = list[i].id;
                idlist.push(id);
            }
        }
        for (i = 0; i < idlist.length; i++) {
            var id = idlist[i];
            var attObj = wp.media.attachment(id);
            attObj.fetch();
            var aaa = JSON.stringify(attObj);
            var att = JSON.parse(aaa);

            var ida = "<div style='margin-left:40px;resize:vertical;overflow:auto;'>";

            titleId = titlePfx + '-' + id;
            captionId = captionPfx + '-' + id;

            var url = att.sizes.thumbnail.url;
            ida += '<div style="height:160px;width:160px;margin-top:20px;margin-right:40px;float:right;"><img style="max-width:100%;max-height:100%;" src="' + url + '"/></div>';
            ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Title</b></label></div><br/><input id=" + titleId + " style='width:100%' type='text' value=" + att.title + "/></div>";
            ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Caption</b></label></div><br/><textarea id=" + captionId + " style='width:100%;' row=3>" + att.caption + "</textarea></div>";
            ida += "</div>";
            ida += "<hr style='margin-top:10px;margin-left:40px;'/>";
            panel.append(ida);
        }
        panel.append("<hr style='clear:left;'/>");
        panel.append("<div style='margin-top:10px;margin-bottom:10px;padding-bottom:40px;'><button class='button-primary button-large' style='margin-right:5px;float:right;' id='" + submitId + "'>Insert Gallery</button><button id='" + backid + "' class='button-primary button-large' style='margin-right:5px;float:right;'>Edit Gallery</button></div>");
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
                console.log('Original contents: ' + contents);
                var gallery = extractGallery(contents);
                console.log('Replacing: ' + gallery + ' with ' + gallerySC);
                contents = contents.replace(gallery, gallerySC);
                tinyMCE.activeEditor.setContent(contents);
                console.log('Loaded edited gallery: ' + contents);
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
        console.log('Saved for selection: ' + idlist);
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
                id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
                console.log('Preselecting id: ' + id);
                var attachment = wp.media.attachment(id);
                attachment.fetch();
                selection.add(attachment);
            }
        }

        object.window.on('open', callback);
    }
});
