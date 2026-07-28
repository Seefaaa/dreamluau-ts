import * as SS13 from "SS13";

declare var iconsByHttp: Record<string, Byond.Icon>;
iconsByHttp ??= {};

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

export function icons<T extends string[]>(http: [...T]): { [K in keyof T]: Byond.Icon } {
    const icons = {} as { [K in keyof T]: Byond.Icon };
    for (const url of http) {
        table.insert(icons, icon(url));
    }
    return icons;
}

declare var soundsByHttp: Record<string, Byond.Sound>;
soundsByHttp ??= {};

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

export function sounds<T extends string[]>(http: [...T]): { [K in keyof T]: Byond.Sound } {
    const sounds = {} as { [K in keyof T]: Byond.Sound };
    for (const url of http) {
        table.insert(sounds, sound(url));
    }
    return sounds;
}
