import { PrismaClient } from '@prisma/client'
import _ from "lodash"
import data from './data.json'; // This import style requires "esModuleInterop", see "side notes"
import { exit } from 'process';
const prisma = new PrismaClient()

async function main() {
    // await Promise.all(
    //     data?.map(async (datum: any) => {
    //         const districts = datum.districts.map((district: any) => {
    //             const wards = district.wards.map((ward: any) => {
    //                 return {
    //                     name: ward.name,
    //                     postcode: ward?.postcode || "",
    //                 }
    //             })
    //             return {
    //                 name: district.name,
    //                 postcode: district?.postcode || "",
    //                 // wards: {
    //                 //     createMany: {
    //                 //         data: wards
    //                 //     }
    //                 // }
    //             }
    //         })
    //         // console.log({districts})
    //         await prisma.region.create({
    //             data: {
    //                 name: datum.name,
    //                 postcode: datum?.postcode || "",
    //                 districts: {
    //                     createMany: {
    //                         data: districts
    //                     }
    //                 }
    //             }
    //         })
    //     })
    // )


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
        const districtData = flats?.find((datx) => datx.name = dic.name)

        const wards = districtData?.wards.map((wardx: any) => {
            return {
                districtId: dic.id,
                name: wardx.name,
                postcode: wardx?.postcode || "",
            }
        })


        await prisma.ward.createMany({
            data: wards
        })

        // await prisma.district.update({
        //     where: { id: dic.id },
        //     data: {
        //         wards: {
        //             createMany: {
        //                 data: wards
        //             }
        //         }
        //     }
        // })


    })

    await Promise.all(wardsInsert)

    // END OF CREATING WARDS

}

const deleteAll = async () => {
    //UNCOMMENT WHEN DEALING WITH ALL DATA OTHERWISE COMMENT IT OUT
    // await prisma.ward.deleteMany({})
    // await prisma.district.deleteMany({})
    // await prisma.region.deleteMany({})

    //UN COMMENT WHEN DEALING WITH WARDS OTHERWISE COMMENT IT OUT 
    await prisma.ward.deleteMany({})
}

deleteAll()
    .then(async () => {
        main()
            .then(async () => {
                await prisma.$disconnect()
            })
            .catch(async (e) => {
                console.error(e)
                await prisma.$disconnect()
                process.exit(1)
            })
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })


