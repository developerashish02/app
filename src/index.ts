import { Context, Elysia, t } from "elysia";
import { dateFormat, getCurrentDate } from "./utils";
import { Prisma, PrismaClient } from "@prisma/client";
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';

const db = new PrismaClient();

const app = new Elysia();

app.use(swagger())

app.use(cors()).listen(3000)

const PORT = 3003;

export const getAccountsOrdersValidation = {
  query: t.Object({
    take: t.String({ pattern: '^[0-9]+$' }),
    lastCursor: t.Optional(t.String()),
    searchParam: t.Optional(t.String()),
    fromDt: t.Optional(t.String({ format: 'date-time' })),
    toDt: t.Optional(t.String({ format: 'date-time' })),
    userId: t.String(),
  })
}

export const getAccountsCustomerValidation = {
  query: t.Object({
    take: t.String({ pattern: '^[0-9]+$' }),
    lastCursor: t.Optional(t.String()),
    searchParam: t.Optional(t.String()),
    fromDt: t.Optional(t.String({ format: 'date-time' })),
    toDt: t.Optional(t.String({ format: 'date-time' })),
    userId: t.String(),
  })
}

app.get(`/api/v1/order/my-orders/accounts`, async (c: Context) => {
  console.log("API END POINT:- ");
  const params = {
    take: "1",
    lastCursor: "0",
    searchTerm: "null",
    fromDt: "2025-04-24",
    toDt: "2025-05-24",
  };
  let { lastCursor, searchTerm, fromDt, toDt } = params;

  const startDt = new Date(fromDt);
  const endDt = new Date(toDt);
  let take = parseInt(params?.take);

  try {
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      c.set.status = 400;
      throw new Error("Invalid date parameters");
    }
    endDt.setHours(23, 59, 59, 999);

    const sanitizedSearchTerm = decodeURIComponent(searchTerm)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const baseWhere: Prisma.Order_Basic_InfoWhereInput = {
      createdAt: {
        gte: startDt.toISOString(),
        lte: endDt.toISOString(),
      },
    };

    const searchFilters: Prisma.Order_Basic_InfoWhereInput =
      sanitizedSearchTerm && sanitizedSearchTerm !== "null"
        ? {
          AND: [
            {
              createdAt: {
                gte: startDt,
                lte: endDt,
              },
            },
            {
              OR: [
                {
                  Order_Sample_Info: {
                    some: {
                      OR: [
                        {
                          Patient_Master: {
                            FIRST_NAME: {
                              contains: sanitizedSearchTerm,
                              mode: "default",
                            },

                            LAST_NAME: {
                              contains: sanitizedSearchTerm,
                              mode: "insensitive",
                            },
                          },
                        },
                        {
                          CURRENT_STATUS: {
                            contains: sanitizedSearchTerm,
                            mode: "insensitive",
                          },
                        },

                        {
                          INTIMATION_HAPL_ID: {
                            contains: sanitizedSearchTerm,
                            mode: "default",
                          },
                        },

                        {
                          SAMPLE_ID: {
                            contains: sanitizedSearchTerm,
                            mode: "default",
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  Customer_Master: {
                    OR: [
                      {
                        FIRST_NAME: {
                          contains: sanitizedSearchTerm,
                          mode: "insensitive",
                        },
                      },
                      {
                        LAST_NAME: {
                          contains: sanitizedSearchTerm,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                },
                {
                  ORDER_ID: {
                    contains: sanitizedSearchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  PRODUCT_NAME: {
                    contains: sanitizedSearchTerm,
                    mode: "insensitive",
                  },
                },
              ],
            },
          ],
        }
        : {};

    const whereClause: Prisma.Order_Basic_InfoWhereInput = {
      AND: [baseWhere, searchFilters],
    };

    const totalCount = await db.order_Basic_Info.count({ where: whereClause });

    const queryOptions: Prisma.Order_Basic_InfoFindManyArgs = {
      where: whereClause,
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        Customer_Master: true,
        Sample_Lab_Event_log: true,
        Order_Sample_Info: {
          include: {
            Patient_Master: true,
            Sample_Lab_Event_log: true,
          },
        },
        Order_Payment_Info: true,
      },
    };

    if (lastCursor && lastCursor !== "0") {
      const [cursorCreatedAt, cursorId] = lastCursor.split("_");
      queryOptions.cursor = {
        id: cursorId,
        createdAt: new Date(cursorCreatedAt),
      };
      queryOptions.skip = 1;
    }
    const result = await db.order_Basic_Info.findMany(queryOptions);

    let hasNextPage = false;

    if (result.length >= take) {
      hasNextPage = true;
    }

    const lastItem = result[result.length - 1];
    const lastCursorValue = lastItem
      ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
      : null;

    const response = {
      data: result,
      metaData: {
        totalCount,
        lastCursor: lastCursorValue,
        hasNextPage,
      },
    };

    c.set.status = 200;
    return { status: 200, success: true, data: response };
  } catch (error: any) {
    console.error("error while getting orders :", error);
    c.set.status = error.status || 500;
    return {
      status: c.set.status,
      success: false,
      message: error.message || "error while getting orders",
    };
  }
});

app.get(`/api/v1/customer/orders`, async (c: Context) => {
  const params = {
    take: "20",
    lastCursor: "0",
    searchTerm: "null",
    fromDt: "2025-04-24",
    toDt: "2025-05-24",
  };
  let { lastCursor, searchTerm, fromDt, toDt } = params;

  const startDt = new Date(fromDt);
  const endDt = new Date(toDt);
  let take = parseInt(params?.take);

  try {
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
      c.set.status = 400;
      throw new Error("Invalid date parameters");
    }
    endDt.setHours(23, 59, 59, 999);

    const sanitizedSearchTerm = decodeURIComponent(searchTerm)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const baseWhere: Prisma.Customer_MasterWhereInput = {
      // createdAt: {
      //   gte: startDt.toISOString(),
      //   lte: endDt.toISOString(),
      // },
    };

    // const searchFilters: Prisma.Order_Basic_InfoWhereInput =
    //   sanitizedSearchTerm && sanitizedSearchTerm !== "null"
    //     ? {
    //       AND: [
    //         {
    //           createdAt: {
    //             gte: startDt,
    //             lte: endDt,
    //           },
    //         },
    //         {
    //           OR: [
    //             {
    //               Order_Sample_Info: {
    //                 some: {
    //                   OR: [
    //                     {
    //                       Patient_Master: {
    //                         FIRST_NAME: {
    //                           contains: sanitizedSearchTerm,
    //                           mode: "default",
    //                         },

    //                         LAST_NAME: {
    //                           contains: sanitizedSearchTerm,
    //                           mode: "insensitive",
    //                         },
    //                       },
    //                     },
    //                     {
    //                       CURRENT_STATUS: {
    //                         contains: sanitizedSearchTerm,
    //                         mode: "insensitive",
    //                       },
    //                     },

    //                     {
    //                       INTIMATION_HAPL_ID: {
    //                         contains: sanitizedSearchTerm,
    //                         mode: "default",
    //                       },
    //                     },

    //                     {
    //                       SAMPLE_ID: {
    //                         contains: sanitizedSearchTerm,
    //                         mode: "default",
    //                       },
    //                     },
    //                   ],
    //                 },
    //               },
    //             },
    //             {
    //               Customer_Master: {
    //                 OR: [
    //                   {
    //                     FIRST_NAME: {
    //                       contains: sanitizedSearchTerm,
    //                       mode: "insensitive",
    //                     },
    //                   },
    //                   {
    //                     LAST_NAME: {
    //                       contains: sanitizedSearchTerm,
    //                       mode: "insensitive",
    //                     },
    //                   },
    //                 ],
    //               },
    //             },
    //             {
    //               ORDER_ID: {
    //                 contains: sanitizedSearchTerm,
    //                 mode: "insensitive",
    //               },
    //             },
    //             {
    //               PRODUCT_NAME: {
    //                 contains: sanitizedSearchTerm,
    //                 mode: "insensitive",
    //               },
    //             },
    //           ],
    //         },
    //       ],
    //     }
    //     : {};

    // TODO :- ADD SEARCH FILTERS
    const whereClause: Prisma.Customer_MasterWhereInput = {
      AND: [baseWhere],
    };

    const totalCount = await db.customer_Master.count({ where: whereClause });

    const queryOptions: Prisma.Customer_MasterFindManyArgs = {
      where: whereClause,
      take,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        Order_Sample_Info: {
          include: {
            Patient_Master: true,
            Sample_Lab_Event_log: true,
          }
        }
      },
    };

    if (lastCursor && lastCursor !== "0") {
      const [cursorCreatedAt, cursorId] = lastCursor.split("_");
      queryOptions.cursor = {
        id: cursorId,
        createdAt: new Date(cursorCreatedAt),
      };
      queryOptions.skip = 1;
    }
    const result = await db.customer_Master.findMany(queryOptions);

    let hasNextPage = false;

    if (result.length >= take) {
      hasNextPage = true;
    }

    const lastItem = result[result.length - 1];
    const lastCursorValue = lastItem
      ? `${lastItem.createdAt.toISOString()}_${lastItem.id}`
      : null;

    const response = {
      data: result,
      metaData: {
        totalCount,
        lastCursor: lastCursorValue,
        hasNextPage,
      },
    };

    c.set.status = 200;
    return { status: 200, success: true, data: response };
  } catch (error: any) {
    console.error("error while getting orders :", error);
    c.set.status = error.status || 500;
    return {
      status: c.set.status,
      success: false,
      message: error.message || "error while getting orders",
    };
  }
});

// server running
app.listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
