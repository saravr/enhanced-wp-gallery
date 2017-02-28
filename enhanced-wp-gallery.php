<?php
/*
 * Plugin Name: Enhanced Wordpress Gallery
 * Description: Plugin for Enhanced Wordpress Gallery
 * Author: Sarav R
 * Version: 0.7
 */

class EnhancedWPGallery {

    private static $instance = null;
    private static $shortcode = 'egallery';

    public static function get_instance() {

        if (null == self::$instance) {
            self::$instance = new self;
        }

        return self::$instance;
    }

    private function __construct() {
        
        add_action('wp_enqueue_media', array($this, 'include_media_button_js_file'));
        add_action('media_buttons', array($this, 'add_my_media_button'), 1);
        add_action('wp_ajax_coll_info', array($this, 'coll_info_callback'));

        add_filter('mce_external_plugins', array($this ,'ewg_mce_external_plugins'));
        add_filter('mce_buttons', array($this, 'ewg_mce_buttons'));
        add_filter('media_view_strings', array($this, 'filter_media_strings'));
        //add_action('admin_head', array($this, 'remove_add_media'));

        add_shortcode(self::$shortcode, array($this, 'replace_egallery_shortcode'));
    }

    function ewg_mce_external_plugins ($plugin_array) {

        $plugin_array[self::$shortcode] = plugins_url('js/mce-button.js', __FILE__);

        return $plugin_array;
    }

    function ewg_mce_buttons($buttons) {

        array_push($buttons, self::$shortcode);
        return $buttons;
    }

    function ewg_shortcode ($atts, $content = null) {
        return "<div>Placeholder</div>"; // TBD
    }

    function include_media_button_js_file () {
        global $post, $pagenow;

        $postid = isset($post->ID) ? $post->ID : 0;

        $legacy_ss = $this->has_legacy_gallery($postid);

        wp_enqueue_script('media_button', plugins_url('js/media_button.js', __FILE__),
            array('jquery', 'jquery-ui-dialog'), '1.8', true);
        wp_localize_script('media_button', 'ewg_data',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'plugins_url' => plugin_dir_url(__FILE__),
                'post_id' => $postid,
                'legacy_ss' => $legacy_ss
            ));
        wp_enqueue_style('eg_style', plugins_url('css/style.css', __FILE__),
            array(), '0.2');
    }

    function add_my_media_button () {

        echo '<a href="#" id="insert-my-media" class="button">Build Gallery</a>';
    }

    function coll_info_callback () {

        $postid = $_POST['postid'];
        $mdata = $_POST['mdata'];
        error_log($postid . ': Gallery collection: ' . print_r($mdata, 1));

        $atts = Array();
        foreach ($mdata as $att) {
            $attid = $att['att'];
            $title = $att['title'];
            $caption = $att['caption'];

            $caption = str_replace("<p>", "", $caption);
            $caption = str_replace("</p>", "", $caption);
            error_log('STRIPPED CAPTION: ' . $caption);

            $att_post = get_post($attid); 
            $post_title = $att_post->post_title;
            $excerpt = $att_post->post_excerpt;
            $parent_id = wp_get_post_parent_id($attid);
            $own_att = ($parent_id == $postid);
            if (!$own_att && (strcmp($title, $post_title) !== 0 ||
                strcmp($caption, $excerpt) !== 0)) {
                $newid = $this->clone_attachment($attid, $title, $caption, $postid);
                array_push($atts, $newid);
            } else {
                $upd_post = array(
                    'ID'           => $attid,
                    'post_title'   => $title,
                    'post_excerpt' => $caption,
                );
                wp_update_post($upd_post);
                array_push($atts, $attid);
            }
        }

        $newids = implode(', ', $atts);
        echo "{\"status\": \"ok\", \"idlist\": \"" . $newids . "\"}";

        wp_die();
    }

    function remove_add_media () {

        $content_post = get_post();
        $content = $content_post->post_content;
        if (stripos($content, '[' . self::$shortcode) !== false) {
            remove_action('media_buttons', 'media_buttons');
        }
    }

    function filter_media_strings ($strings) {

        //if(!current_user_can('edit_posts')){
            unset($strings["createGalleryTitle"]);
            unset($strings["createVideoPlaylistTitle"]);
        //}

        return $strings;
    }

    private function clone_attachment ($src_id, $title, $caption, $parent_id) {
        global $wpdb;

        $caption = stripslashes($caption);
        $clone_id = '';
        $table_name = $wpdb->prefix . "posts";
        $sql = 'SELECT * FROM ' . $table_name . ' WHERE id = ' . $src_id;
        $results = $wpdb->get_results($sql, OBJECT);
        foreach ($results as $result) {
            $res = $wpdb->insert(
                $wpdb->posts,
                array(
                    'post_author' => $result->post_author,
                    'post_date' => $result->post_date,
                    'post_date_gmt' => $result->post_date_gmt,
                    'post_title' => $title,
                    'post_excerpt' => $caption,
                    'post_status' => $result->post_status,
                    'comment_status' => $result->comment_status,
                    'ping_status' => $result->ping_status,
                    'post_name' => $result->post_name,
                    'post_modified' => current_time('mysql'),
                    'post_modified_gmt' => current_time('mysql'),
                    'post_parent' => $parent_id,
                    'guid' => $result->guid,
                    'post_type' => $result->post_type,
                    'post_mime_type' => $result->post_mime_type
                ),
                array(
                    '%s', '%s', '%s', '%s', '%s', '%s',
                    '%s', '%s', '%s', '%s', '%s', '%d',
                    '%s', '%s', '%s'
                )
            );

            if ($res) {
                $clone_id = $wpdb->insert_id;

                $attrs = array("_wp_attached_file", "amazonS3_info", "_wp_attachment_metadata");
                foreach ($attrs as $attr) {
                    if (!$this->clone_meta($src_id, $clone_id, $attr)) {
                        error_log("Failed to clone key: " . $attr . " (" . $src_id . ")");
                    }
                }
            }
            break; // TBD
        }

        return $clone_id;
    }

    private function clone_meta ($src_id, $clone_id, $key) {

        $value = get_post_meta($src_id, $key, true);
        return add_post_meta($clone_id, $key, $value);
    }

    function replace_egallery_shortcode ($atts) {

        $ids = $atts['ids'];
        $sc = '[gallery ids="' . $ids . '" columns="1" size="full"]';
        return do_shortcode($sc);
    }

    private function has_legacy_gallery ($postid) {

        if (get_post_format($postid) == "gallery") {
            $content_post = get_post($postid);
            $content = $content_post->post_content;
            if (strpos($content, '[gallery') !== false) {
                return "yes";
            }
        }

        return "no";
    }
}

EnhancedWPGallery::get_instance();

