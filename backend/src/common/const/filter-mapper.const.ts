import { Any, ArrayContainedBy, ArrayContains, ArrayOverlap, Between, Equal, ILike, In, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not, } from "typeorm";

export const FILTER_MAPPER = {
    not: Not, 
    equal: Equal, 
    like: Like, 
    i_like: ILike, 
    in: In,
    less_than: LessThan,
    less_than_or_equal: LessThanOrEqual,
    more_than: MoreThan, 
    more_than_or_equal: MoreThanOrEqual,
    between: Between,
    is_null: IsNull,
    array_contains: ArrayContains,
    array_contained_by: ArrayContainedBy,
    array_overlap: ArrayOverlap,
}