import * as SS13 from "SS13";

declare var iconsByHttp: Record<string, Byond.Icon>;
iconsByHttp = iconsByHttp ?? {};

export function icon(http: string): Byond.Icon {
    if (iconsByHttp[http]) {
        return iconsByHttp[http] as Byond.Icon;
    }

    const request = SS13.new<Byond.Datum.HttpRequest>("/datum/http_request");
    const fileName = "tmp/custom_map_icon.dmi";
    request.prepare("get", http, "", "", fileName);
    request.begin_async();
    while (request.is_complete() === 0) {
        sleep();
    }
    iconsByHttp[http] = SS13.new<Byond.Icon>("/icon", fileName);
    return iconsByHttp[http];
}

export function icons<T extends string[]>(http: [...T]): { [K in keyof T]: Byond.Icon } {
    return http.map((url) => icon(url)) as { [K in keyof T]: Byond.Icon };
}

declare var soundsByHttp: Record<string, Byond.Sound>;
soundsByHttp = soundsByHttp ?? {};

export function sound(http: string): Byond.Sound {
    if (soundsByHttp[http]) {
        return soundsByHttp[http];
    }

    const request = SS13.new<Byond.Datum.HttpRequest>("/datum/http_request");
    const fileName = "tmp/custom_map_sound.ogg";
    request.prepare("get", http, "", "", fileName);
    request.begin_async();
    while (request.is_complete() === 0) {
        sleep();
    }
    soundsByHttp[http] = SS13.new<Byond.Sound>("/sound", fileName);
    return soundsByHttp[http];
}

export function sounds<T extends string[]>(http: [...T]): { [K in keyof T]: Byond.Sound } {
    return http.map((url) => sound(url)) as { [K in keyof T]: Byond.Sound };
}
