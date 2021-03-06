
/*  ********* TEMPORARILY HERE **************
 * - will be on npm soon -
 *   import { ngAspnetCoreEngine } from `@universal/ng-aspnetcore-engine`;
 */

import { Type, NgModuleRef, ApplicationRef, Provider } from '@angular/core';
import { platformDynamicServer, PlatformState } from '@angular/platform-server';

export function ngAspnetCoreEngine(
    providers: Provider[],
    ngModule: Type<{}>
): Promise<{ html: string, globals: { styles: string, title: string, meta: string, [key: string]: any } }> {

    return new Promise((resolve, reject) => {

        const platform = platformDynamicServer(providers);

        return platform.bootstrapModule(<Type<{}>>ngModule).then((moduleRef: NgModuleRef<{}>) => {

            const state: PlatformState = moduleRef.injector.get(PlatformState);
            const appRef: ApplicationRef = moduleRef.injector.get(ApplicationRef);

            appRef.isStable
                .filter((isStable: boolean) => isStable)
                .first()
                .subscribe((stable) => {

                    // Fire the TransferCache
                    const bootstrap = moduleRef.instance['ngOnBootstrap'];
                    bootstrap && bootstrap();

                    // The parse5 Document itself
                    const AST_DOCUMENT = state.getDocument();

                    // Strip out the Angular application
                    const htmlDoc = state.renderToString();
                    console.log(htmlDoc);
                    const APP_HTML = htmlDoc.substring(
                        htmlDoc.indexOf('<body>') + 6,
                        htmlDoc.indexOf('</body>')
                    );

                    // Strip out Styles / Meta-tags / Title
                    const STYLES = [];
                    const META = [];
                    const LINKS = [];
                    let TITLE = '';

                    const STYLES_STRING = htmlDoc.substring(
                        htmlDoc.indexOf('<style ng-transition'),
                        htmlDoc.lastIndexOf('</style>') + 8
                    );

                    // console.log(AST_DOCUMENT);

                    const HEAD = AST_DOCUMENT.head;

                    let count = 0;

                    for (let i = 0; i < HEAD.children.length; i++) {
                        let element = HEAD.children[i];

                        console.log(element.name);
                        console.log(element.children);


                        if (element.name === 'title') {
                            TITLE = element.children[0].data;
                        }

                        // Broken after 4.0 (worked in rc)
                        // if (element.name === 'style') {
                        //     let styleTag = '<style ';
                        //     for (let key in element.attribs) {
                        //         styleTag += `${key}="${element.attribs[key]}">`;
                        //     }

                        //     styleTag += `${element.children[0].data}</style>`;
                        //     STYLES.push(styleTag);
                        // }

                        if (element.name === 'meta') {
                            count = count + 1;
                            console.log(`\n\n\n ******* Meta count = ${count}`);
                            let metaString = '<meta';
                            for (let key in element.attribs) {
                                metaString += ` ${key}="${element.attribs[key]}"`;
                            }
                            META.push(`${metaString} />\n`);
                        }

                        if (element.name === 'link') {
                            let linkString = '<link';
                            for (let key in element.attribs) {
                                linkString += ` ${key}="${element.attribs[key]}"`;
                            }
                            LINKS.push(`${linkString} />\n`);
                        }
                    }

                    resolve({
                        html: APP_HTML,
                        globals: {
                            styles: STYLES_STRING,
                            title: TITLE,
                            meta: META.join(' '),
                            links: LINKS.join(' ')
                        }
                    });

                    moduleRef.destroy();

                });
        }).catch(err => {
            reject(err);
        });

    });
}