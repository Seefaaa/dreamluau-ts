import * as SS13 from "SS13";

declare var iconsByHttp: Record<string, Byond.Icon>;
iconsByHttp ??= {};

/**
 * Loads an icon from a given HTTP URL and returns a `Byond.Icon` object. If the icon has already been loaded, it returns the cached version.
 * @param http The HTTP URL of the icon to load.
 * @returns A `Byond.Icon` object representing the loaded icon.
 */
export function icon(http: string): Byond.Icon {
    if (iconsByHttp[http]) {
        return iconsByHttp[http];
    }

    const request = SS13.new("/datum/http_request");
    const fileName = "tmp/custom_map_icon.dmi";

    request.prepare("get", http, "", "", fileName);
    request.begin_async();

    while (request.is_complete() === 0) {
        sleep();
    }

    iconsByHttp[http] = SS13.new("/icon", fileName);

    return iconsByHttp[http];
}

/**
 * Loads multiple icons from given HTTP URLs and returns an array of `Byond.Icon` objects. If an icon has already been loaded, it returns the cached version.
 * @param http An array of HTTP URLs of the icons to load.
 * @returns An array of `Byond.Icon` objects representing the loaded icons.
 */
export function icons<T extends string[]>(http: [...T]): { [K in keyof T]: Byond.Icon } {
    const icons = [] as { [K in keyof T]: Byond.Icon };
    for (const url of http) {
        table.insert(icons, icon(url));
    }
    return icons;
}

declare var soundsByHttp: Record<string, Byond.Sound>;
soundsByHttp ??= {};

/**
 * Loads a sound from a given HTTP URL and returns a `Byond.Sound` object. If the sound has already been loaded, it returns the cached version.
 * @param http The HTTP URL of the sound to load.
 * @returns A `Byond.Sound` object representing the loaded sound.
 */
export function sound(http: string): Byond.Sound {
    if (soundsByHttp[http]) {
        return soundsByHttp[http];
    }

    const request = SS13.new("/datum/http_request");
    const fileName = "tmp/custom_map_sound.ogg";

    request.prepare("get", http, "", "", fileName);
    request.begin_async();

    while (request.is_complete() === 0) {
        sleep();
    }

    soundsByHttp[http] = SS13.new("/sound", fileName);

    return soundsByHttp[http];
}

/**
 * Loads multiple sounds from given HTTP URLs and returns an array of `Byond.Sound` objects. If a sound has already been loaded, it returns the cached version.
 * @param http An array of HTTP URLs of the sounds to load.
 * @returns An array of `Byond.Sound` objects representing the loaded sounds.
 */
export function sounds<T extends string[]>(http: [...T]): { [K in keyof T]: Byond.Sound } {
    const sounds = [] as { [K in keyof T]: Byond.Sound };
    for (const url of http) {
        table.insert(sounds, sound(url));
    }
    return sounds;
}
