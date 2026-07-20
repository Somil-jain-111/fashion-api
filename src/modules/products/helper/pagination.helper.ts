export class PaginationHelper {
  static paginate<T>(data: T[], page = 1, pageSize = 10) {
    const totalItems = data.length;

    const totalPages = Math.ceil(totalItems / pageSize);

    const start = (page - 1) * pageSize;

    return {
      data: data.slice(start, start + pageSize),
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize,
      },
    };
  }
}
