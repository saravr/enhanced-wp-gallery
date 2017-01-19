jQuery(function($) {

    var url = ewg_data.ajax_url;
    var plugins_url = ewg_data.plugins_url;
    var shortcode = 'egallery'; // TBD replace shortcodes below

    $(document).ready(function(e){

        if (ewg_data.legacy_ss == "yes") {
            console.log('Post has legacy slideshow, ignore');
            return;
        }

        //preventing loss of focus
        $(document).on('focusin', function(e) {
            if ($(e.target).closest(".mce-window").length) {
                e.stopImmediatePropagation();
            }
        });
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

        var contents = tinyMCE.get("content").getContent();
        var gallery = extractGallery(contents);

        contents = contents.replace(gallery, "");
        console.log('Removing gallery: ' + gallery);
        tinyMCE.get("content").setContent(contents);
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
            var contents = tinyMCE.get("content").getContent();
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
        var togglePfx = 'ewg-toggle-' + dt;

        console.log('BACKTAG: ' + backtag);
        var panel = jQuery('<div id="newgl" style="overflow-y:scroll;height:540px;"></div>');
        panel.sortable({
            stop: function (event, ui) {
                var lst = jQuery("#newgl .ewg-caption")
                for (i = 0; i < lst.length; i++) {
                    var editorId = lst[i].id;
                    tinyMCE.get(editorId).remove();
                    tinyMCE.execCommand("mceAddEditor", false, editorId);
                }
            }
        });
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
            var id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
            var attObj = wp.media.attachment(id);
            attObj.fetch();
            var aaa = JSON.stringify(attObj); // TBD !!!
            var att = JSON.parse(aaa);

            var ida = '<div class="ewg-att" id="att-' + id + '" style="padding-bottom:20px;margin-left:40px;resize:vertical;">';
// removed overflow:auto 1/18/17 causing overlap issue

            var titleId = titlePfx + '-' + id;
            var captionId = captionPfx + '-' + id;
            var toggleId = togglePfx + '-' + id;

            var url = att.sizes.thumbnail.url;

            var deleteId = 'ewg-delete-' + dt + '-' + id;
            var deleteTag = '#' + deleteId;
            var delButton = "<div style='width:320px;'><button class='button-primary button-small ewg-remove-button' style='float:right;margin-bottom:10px;' id='" + deleteId + "'>Remove</button></div>";

            ida += '<div style="width:320px;margin-top:10px;margin-right:40px;margin-bottom:40px;float:right;">' + delButton + '<img style="float:right;" class="ewg-image" src="' + url + '"/></div>';
            ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Title</b></label></div><br/><input id=" + titleId + " style='width:100%' type='text' value=\"" + att.title + "\"/></div>";
            ida += "<div style='width:60%;margin-top:5px;'><div style='margin-top:20px;'><label style='clear:left;'><b>Caption</b></label>&nbsp;<a href='#' class='ewg-button' style='float:right;' id=" + toggleId + ">View Text</a></div><br/><div style='border:1px solid #ddd;'><textarea class='ewg-caption' id=" + captionId + " style='width:100%;' row=3>" + att.caption + "</textarea></div></div>";

            ida += "</div>";
            panel.append(ida);
        }

        panel.append("<hr style='clear:left;'/>");

        console.log('User selected ids: ' + idlist);

        var outerPanel = jQuery('<div style="overflow-y:hidden;height:660px;background:white;"></div>');
        var header = jQuery('<div style="height:40px;padding-left:20px;"><h1>Edit Gallery</h1></div>');

        var buttonTitle = (object.galleryMode === "edit") ? "Update Gallery" : "Insert Gallery";

        var footer = jQuery("<div style='padding-top:10px;padding-right:20px;bottom:0px;height:60px;'><button class='button-primary button-large' style='margin-left:10px;float:right;' id='" + submitId + "'>" + buttonTitle + "</button><button id='" + backid + "' class='button-primary button-large' style='margin-left:10px;float:right;'>Add Images</button></div>");

        outerPanel.append(header);
        outerPanel.append(panel);
        outerPanel.append(footer);

        jQuery(".media-modal-content").replaceWith(outerPanel);

        for (i = 0; i < idlist.length; i++) {
            var id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];

            tinymce.init({
                selector: "#" + captionId,
                menu: {},
                plugins: "tabfocus,paste,media,fullscreen,wordpress,wpeditimage,wpgallery,wplink,wpdialogs",
                toolbar: "bold italic | link unlink",
            });

            var captionId = captionPfx + '-' + id;
            var toggleId = togglePfx + '-' + id;
            (function(tId, cId) {
                jQuery("#" + tId).on('click', function(e) {
                    tinyMCE.execCommand('mceToggleEditor', false, cId);
                    jQuery(this).text(function (i, text) {
                        return text === "View Text" ? "View Styled" : "View Text";
                    });
                });
            })(toggleId, captionId);

            var deleteId = 'ewg-delete-' + dt + '-' + id;
            var deleteTag = '#' + deleteId;
            jQuery(deleteTag).off('click');
            (function(idx) {
                jQuery(deleteTag).click(function (e) {
                    jQuery("#att-" + idx).hide('slow', function() {
                        this.remove();
                        var newlist = [];
                        for (i = 0; i < idlist.length; i++) {
                            var idc = (typeof idlist[i] === "string") ?
                                idlist[i].trim() : idlist[i];
                            if (idc === idx) {
                                idlist.splice(i, 1);
                            }
                        }
                        console.log('ID list after remove: ' + idlist);
                    });
                });
            })(id);
        }

        console.log('Setting back handler with idlist: ' + idlist);
        jQuery(backtag).off('click');
        jQuery(backtag).click(function(e) { backHandler(idlist, object); });

        jQuery(submitTag).off('click');
        jQuery(submitTag).click(function(e) { submitHandler(dt, object); });

        object.window.open();
    }

    var submitHandler = function (dt, object) {

        var idlist = [];
        divlist = jQuery("#newgl").children("div[id]");
        for (i = 0; i < divlist.length; i++) {
            var newId = divlist[i].id.replace("att-", "");
            idlist.push(newId);
        }

        var mdata = [];
        for (i = 0; i < idlist.length; i++) {
            var id = (typeof idlist[i] === "string") ? idlist[i].trim() : idlist[i];
            console.log('SUBMIT ID: ' + id);

            var titleId = 'ewg-title-' + dt + '-' + id;
            var title = jQuery("#" + titleId).val();
            console.log(dt + ": title: " + title);
            title = (title !== undefined) ? title : "";

            var captionId = 'ewg-caption-' + dt + '-' + id;
            //var caption = jQuery("#" + captionId).val();
            var captionObj = tinyMCE.get(captionId);
            var caption = (captionObj != null) ? captionObj.getContent() : "";

            console.log(dt + ": caption: " + caption);

            mdata.push({"att": id, "title": title, "caption": caption});
        }

        sendSelection(mdata, object, function(idlist, object) {

            var gallerySC = '[egallery ids="' + idlist + '"]';
            console.log('GALLERY SC: ' + gallerySC);
            if (object.galleryMode === "new") {
                wp.media.editor.insert(gallerySC);
            } else {
                var contents = tinyMCE.get("content").getContent();
                console.log('Original contents: ' + contents);
                var gallery = extractGallery(contents);
                console.log('Replacing: ' + gallery + ' with ' + gallerySC);
                contents = contents.replace(gallery, gallerySC);
                tinyMCE.get("content").setContent(contents);
                console.log('Loaded edited gallery: ' + contents);
            }
        });

        jQuery("#newgl").remove();
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
        jQuery("#newgl").remove();
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
