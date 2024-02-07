import axios from "axios"
import FormData from "form-data";
import fs from "fs"
import { PrismaClient } from '@prisma/client'
import _ from "lodash"
import { exit } from 'process';
import data from './data.json'; // This import style requires "esModuleInterop", see "side notes"
import throttledQueue from 'throttled-queue'

const prisma = new PrismaClient()

const callApi = (params: any = {}) => {
    return new Promise((resolve, reject) => {
        let {
            requestType = 'GET',
            requestParams,
            requestUrl,
            requestHeaders,
        } = params;

        let numberOfTrials = 20;

        function action() {
            //...
            //handle requests of different types
            if (requestType === 'GET') {
                //call get request
                // @ts-ignore
                axios.get(requestUrl, { requestParams, headers: requestHeaders }
                ).then(response => {
                    //handle response here
                    resolve(response.data);
                }).catch(error => {
                    //handle error
                    console.log(requestUrl);
                    //reject(error.message);

                    //retry request
                    --numberOfTrials;
                    runner();
                })

            } else if (requestType === 'POST') {
                //call post request
                let formData = new FormData();
                for (let key in requestParams) {
                    formData.append(key, requestParams[key]);
                }

                axios.post(
                    requestUrl,
                    formData,
                    { headers: requestHeaders }
                ).then(response => {
                    //handle response here
                    resolve(response.data);
                }).catch(error => {
                    //handle error
                    // const streetId=formData.
                    console.log(numberOfTrials + ' :Network error for ' + requestUrl, " : ", error);
                    //reject(error.message);

                    //retry request 
                    --numberOfTrials;
                    runner()

                })

            } else {
                reject("Unsupported request")
            }
            //...

        }

        function runner() {
            if (numberOfTrials > 0) {
                if (numberOfTrials === 5) {
                    //first time run
                    action();
                } else {
                    //schedule in few seconds
                    setTimeout(() => {
                        action()
                    }, 20000);
                }
            } else {
                reject("Network error");
            }
        }

        runner();

    })
}

const scrapRoads = (params: any = {}) => {
    return new Promise(async (resolve, reject) => {

        let {
            streetId,
        } = params

        let roadsUrl = `https://testnapa.mawasiliano.go.tz/napa-api-v2/public/api/pub/drill_locations`;

        await callApi({
            requestType: "POST",
            requestUrl: roadsUrl,
            requestHeaders: {
                'X-NAPA-API-KEY': 'yF4eikCjQOylx4yV0ieyWf0otus7cUqRnMAIzzP36BDEnmNVC42KkCug1XsVynaw',
            },
            requestParams: {
                location_id: streetId,
                skip: 0,
            }
        }).then(response => {
            //console.log(response);
            // @ts-ignore
            if (response && response.data) {
                //response.data here carries all the regions
                // @ts-ignore
                resolve(response.data);
            } else {
                reject(`Failed to fetch roads for streetId ${streetId} from NaPA`);
            }
        }).catch(error => {
            console.log("Failed to get data for : ", streetId)
            reject(error);
        })

        // (async () => {
        //     try {
        //         const rawResponse = await fetch("https://testnapa.mawasiliano.go.tz/napa-api-v2/public/api/pub/drill_locations", {
        //             method: 'POST',
        //             headers: {
        //                 'Accept': 'application/json',
        //                 // 'Content-Type': 'application/json',
        //                 // 'X-NAPA-API-KEY': 'yF4eikCjQOylx4yV0ieyWf0otus7cUqRnMAIzzP36BDEnmNVC42KkCug1XsVynaw',
        //                 // 'Host': 'napa.mawasiliano.go.tz',
        //                 // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        //                 // 'Accept': 'application/json, text/plain, */*',
        //                 'Accept-Language': 'en-US,en;q=0.5',
        //                 'Accept-Encoding': 'gzip, deflate, br',
        //                 'Content-Type': 'application/json',
        //                 'X-NAPA-API-KEY': 'zpORAHpl6YfJGlTROGF3Jlm9hLQ9FZPakO4wzrirQQq8LdeoMMEWLoaDIhXi8Ubz',
        //                 // 'Content-Length': '30',
        //                 // 'Origin': 'https://napa.mawasiliano.go.tz',
        //                 // 'Connection': 'keep-alive',
        //                 // 'Referer': 'https://napa.mawasiliano.go.tz/find-address-code',
        //                 // 'Sec-Fetch-Dest': 'empty',
        //                 // 'Sec-Fetch-Mode': 'cors',
        //                 // 'Sec-Fetch-Site': 'same-origin'
        //             },
        //             body: JSON.stringify({ "location_id": streetId, "skip": 0 }),

        //         });
        //         const content = await rawResponse.json();
        //         resolve(content)
        //     } catch (error) {
        //         console.log("Something went wrong : ", error)
        //         reject(error)
        //     }

        // })();

    })
}

function scrapAddress(params: any = {}) {
    return new Promise(async (resolve, reject) => {

        let {
            roadId,
        } = params

        let addressesUrl = `https://testnapa.mawasiliano.go.tz/napa-api-v2/public/api/pub/skip_addresses/${roadId}`;

        await callApi({
            requestType: "GET",
            requestUrl: addressesUrl,
            requestHeaders: {
                'X-Napa-Api-Key': 'yF4eikCjQOylx4yV0ieyWf0otus7cUqRnMAIzzP36BDEnmNVC42KkCug1XsVynaw',
            }
        }).then(response => {
            //console.log(response);
            // @ts-ignore
            if (response && response.data) {
                //response.data here carries all the regions
                // @ts-ignore
                resolve(response.data);
            } else {
                reject(`Failed to fetch addresses for road ${roadId} from NaPA`);
            }
        }).catch(error => {
            reject(error);
        })
    })
}

const getFromRoads = async () => {

    const dicsWithWards = data?.map((dic2) => {
        return dic2.districts
    })

    const flats = dicsWithWards?.flat()
    const wardsWithStreets = flats.map((flat) => {
        return flat.wards
    })
    const wardsFlat = _.flattenDeep(wardsWithStreets) as any

    const streetsData = wardsFlat.map((ward) => {
        return ward.streets
    })

    const streets = _.flattenDeep(streetsData) as any

    const streetIds = streets.map((street) => {
        return street.id
    })

    let throttle = throttledQueue(15, 1000) // 15 times per second
    const allRoads = []

    // console.log(streetIds.length)

    // for (const streetId of streetIds) {
    //     throttle(async () => {
    //         const roads = await scrapRoads({ streetId, skip: 0 }) as any[]
    //         console.log("Successing getting roads")
    //         console.log({ roads })

    //     })
    // }

    // const roadsFats = allRoads.flat()
    // // console.log({ roadsFats })

    // const jsonData = fs.writeFile("streets_roads.json", JSON.stringify(roadsFats), error => {
    //     if (error) {
    //         console.log("Failed to write to file")
    //     } else {
    //         console.log("Successfully wrote file")
    //     }
    // })   

    function paginate(array, page_size, page_number) {
        // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
        return array.slice((page_number - 1) * page_size, page_number * page_size);
    }

    // let allPagesData = [];

    // await (async function () {
    //     for (const num of Array.from({ length: 1 }, (_, i) => i + 1)) {
    //         if (paginate(streetIds, 500, num).length === 0) {
    //             break;
    //         }
    //         const roadsPromises = paginate(streetIds, 500, num).map(async (streetId) => {
    //             // console.log("Fetching for : ", streetId)
    //             const roads = await scrapRoads({ streetId, skip: 0 }) as any[]
    //             if (roads.length === 0) return { streetId, roads: [] }
    //             return {
    //                 streetId,
    //                 roads
    //             }

    //         })
    //         const allData = await Promise.all(roadsPromises)
    //         allPagesData.push(allData)
    //     }
    // })();

    // const roadsData = allPagesData.map((roads) => roads.roads).flat()
    // console.log("All saved data : ", roadsData.length)

    async function roadsPages() {
        let allPagesData = []
        for await (const page of Array.from({ length: 60 }, (_, i) => i + 1)) {
            if (paginate(streetIds, 500, page).length === 0) {
                break;
            }
            const roadsPromises = paginate(streetIds, 500, page).map(async (streetId) => {
                // console.log("Fetching for : ", streetId)
                const roads = await scrapRoads({ streetId, skip: 0 }) as any[]
                if (roads.length === 0) return { streetId, roads: [] }
                return {
                    streetId,
                    roads
                }

            })
            const allData = await Promise.all(roadsPromises)
            allPagesData.push(allData)
        }
        const allRoadsData = _.flattenDepth(allPagesData, 1);
        const allRoads = allRoadsData.map((streetRoads) => streetRoads.roads).flat()
        console.log("All data : ", allRoads.length)

        const jsonData = fs.writeFile("streets_roads_final.json", JSON.stringify(allRoadsData), error => {
            if (error) {
                console.log("Failed to write to file")
            } else {
                console.log("Successfully wrote file")
            }
        })

    }

    await roadsPages()

    // const roadsPromises = paginate(streetIds, 500, 1).map(async (streetId) => {
    //     // console.log("Fetching for : ", streetId)
    //     const roads = await scrapRoads({ streetId, skip: 0 }) as any[]
    //     if (roads.length === 0) return { streetId, roads: [] }
    //     return {
    //         streetId,
    //         roads
    //     }

    // })
    // const allData = await Promise.all(roadsPromises)

    // const jsonData = fs.writeFile("streets_roads_final.json", JSON.stringify(allData), error => {
    //     if (error) {
    //         console.log("Failed to write to file")
    //     } else {
    //         console.log("Successfully wrote file")
    //     }
    // })


    // const roadsPromises = paginate(streetIds, 500, 1).map(async (streetId) => {
    //     // console.log("Fetching for : ", streetId)
    //     const roads = await scrapRoads({ streetId, skip: 0 }) as any[]
    //     if (roads.length === 0) return { streetId, roads: [] }
    //     return {
    //         streetId,
    //         roads
    //     }

    // })
    // const allData = (await Promise.all(roadsPromises)).flat() as any[]

    // const roadsData = allData.map(street => street.roads).flat()
    // console.log("All promises : ", roadsData.length, " , passed : ", _.compact(roadsData).length)

    // const jsonData = fs.writeFile("streets_roads.json", JSON.stringify(allData), error => {
    //     if (error) {
    //         console.log("Failed to write to file")
    //     } else {
    //         console.log("Successfully wrote file")
    //     }
    // })


    // const roadsData=await Promise.all(roadsPromises)

    // const roads = await scrapRoads({ streetId: 84349, skip: 0 })
    // console.log(JSON.stringify({ roads }, null, 3))

    // const streetsWithRoads = streets.map(async (street) => {
    //     const roads = await scrapRoads({ streetId: street.id, skip: 0 })

    //     // @ts-ignore
    //     // const roadsWithAddresses = roads?.map(async (road) => {
    //     //     const addresses = await scrapAddress({ roadId: road.id })
    //     //     return {
    //     //         ...road,
    //     //         addresses
    //     //     }
    //     // })
    //     // const finalRoads = await Promise.all(roadsWithAddresses)

    //     return {
    //         ...street,
    //         roads: roads
    //     }
    // })
    // const finalStreets = await Promise.all(streetsWithRoads)

    // console.log(streetsWithRoads.length)

    // const jsonData = fs.writeFile("streets_roads_addresses.json", JSON.stringify(finalStreets), error => {
    //     if (error) {
    //         console.log("Failed to write to file")
    //     } else {
    //         console.log("Successfully wrote file")
    //     }
    // })
}

getFromRoads()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })