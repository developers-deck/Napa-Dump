import { PrismaClient } from '@prisma/client'
import _ from "lodash"
import data from './data.json'; // This import style requires "esModuleInterop", see "side notes"
import { exit } from 'process';
const prisma = new PrismaClient()

async function main() {

    await prisma.ward.deleteMany({})
    await prisma.district.deleteMany({})
    await prisma.region.deleteMany({})


    await Promise.all(
        data?.map(async (datum: any) => {
            const districts = datum.districts.map((district: any) => {
                const wards = district.wards.map((ward: any) => {
                    return {
                        name: ward.name,
                        postcode: ward?.postcode || "",
                    }
                })
                return {
                    name: district.name,
                    postcode: district?.postcode || "",
                    // wards: {
                    //     createMany: {
                    //         data: wards
                    //     }
                    // }
                }
            })
            // console.log({districts})
            await prisma.region.create({
                data: {
                    name: datum.name,
                    postcode: datum?.postcode || "",
                    districts: {
                        createMany: {
                            data: districts
                        }
                    }
                }
            })
        })
    )

}

const saveWards = async () => {
    await prisma.ward.deleteMany({})
    // // CREATING WARDS

    const dics = await prisma.district.findMany({
        select: {
            id: true,
            name: true
        }
    })

    const wardsInsert = dics.map(async (dic) => {
        // @ts-ignore
        const dicsWithWards = data?.map((dic2) => {
            return dic2.districts
        })

        const flats = dicsWithWards?.flat()

        const districtData = flats?.filter((datx) => datx.name === dic.name)[0]

        const wards = districtData?.wards.map((wardx: any) => {
            return {
                // districtId: dic.id,
                name: wardx.name,
                postcode: wardx?.postcode || "",
            }
        })


        await prisma.district.update({
            where: { id: dic.id },
            data: {
                wards: {
                    createMany: {
                        data: wards
                    }
                }
            }
        })
        return wards

    })

    const finalData = await Promise.all(wardsInsert)
    // END OF CREATING WARDS
}


const saveStreets = async () => {
    await prisma.street.deleteMany({})

    const wardsInitialData = await prisma.ward.findMany({
        select: {
            id: true,
            name: true
        }
    })

    const wardsInsert = wardsInitialData.map(async (ward) => {

        const dicsWithWards = data?.map((dic2) => {
            return dic2.districts
        })

        const flats = dicsWithWards?.flat()
        const wardsWithStreets = flats.map((flat) => {
            return flat.wards
        })
        const wardsFlat = _.flattenDeep(wardsWithStreets) as any

        const wardsData = wardsFlat?.filter((datx) => datx.name === ward.name)[0]

        const streets = wardsData?.streets.map((streetx: any) => {
            return {
                // districtId: dic.id,
                name: streetx.name,
                postcode: streetx?.postcode || "",
            }
        })

        console.log(streets)

        await prisma.ward.update({
            where: { id: ward.id },
            data: {
                streets: {
                    createMany: {
                        data: streets
                    }
                }
            }
        })
        return streets
    })

    const streetsFinal = await Promise.all(wardsInsert)


}

const confirmStreets = async () => {
    const testWard = await prisma.street.findMany({
        where: {
            name: "TANKINI"
        },
        include: {
            ward:true
        }
    })

    console.log(testWard)

}

confirmStreets()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })