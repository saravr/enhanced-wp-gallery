<?php
/*
 * Plugin Name: Enhanced Wordpress Gallery
 * Description: Plugin for Enhanced Wordpress Gallery
 * Author: Sarav R
 * Version: 0.3
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
        add_action('media_buttons', array($this, 'add_my_media_button'));
        add_action('wp_ajax_coll_info', array($this, 'coll_info_callback'));

        add_filter('mce_external_plugins', array($this ,'ewg_mce_external_plugins'));
        add_filter('mce_buttons', array($this, 'ewg_mce_buttons'));
    }

    function ewg_mce_external_plugins($plugin_array) {

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
        global $post;

        $postid = isset($post->ID) ? $post->ID : 0;

        wp_enqueue_script('media_button', plugins_url('js/media_button.js', __FILE__),
            array('jquery', 'jquery-ui-dialog'), '1.0', true);
        wp_localize_script('media_button', 'ewg_data',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'plugins_url' => plugin_dir_url(__FILE__),
                'post_id' => $postid
            ));
        wp_enqueue_style('eg_style', plugins_url('css/style.css', __FILE__));
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

            $att_post = get_post($attid); 
            $post_title = $att_post->post_title;
            $excerpt = $att_post->post_excerpt;
            if (strcmp($title, $post_title) !== 0 ||
                strcmp($caption, $excerpt) !== 0) {
                $newid = $this->clone_attachment($attid, $title, $caption);
                array_push($atts, $newid);
            } else {
                array_push($atts, $attid);
            }
        }

        $newids = implode(', ', $atts);
        echo "{\"status\": \"ok\", \"idlist\": \"" . $newids . "\"}";

        wp_die();
    }

    private function clone_attachment ($parent_id, $title, $caption) {
        global $wpdb;

        $clone_id = '';
        $table_name = $wpdb->prefix . "posts";
        $sql = 'SELECT * FROM ' . $table_name . ' WHERE id = ' . $parent_id;
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
                    if (!$this->clone_meta($parent_id, $clone_id, $attr)) {
                        error_log("Failed to clone key: " . $attr . " (" . $parent_id . ")");
                    }
                }
            }
            break; // TBD
        }

        return $clone_id;
    }

    private function clone_meta ($parent_id, $clone_id, $key) {

        $value = get_post_meta($parent_id, $key, true);
        return add_post_meta($clone_id, $key, $value);
    }
}

EnhancedWPGallery::get_instance();

