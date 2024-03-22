/* eslint-disable @typescript-eslint/no-explicit-any */
// https://stackoverflow.com/questions/65154695/typescript-types-for-a-pipe-function

type LastElement<T> = T extends [...unknown[], infer LastItem] ? LastItem : never

type Operator<A, B> = (value: A) => B
type OperatorB<T> = T extends Operator<any, infer B> ? B : never

type PipeOperators<Operators extends unknown[], Input> =
  Operators extends [infer Item, ...infer Tail]
  ? [Operator<Input, OperatorB<Item>>, ...PipeOperators<Tail, OperatorB<Item>>]
  : Operators
type PipeOperatorsOutput<Operators extends unknown[]> = OperatorB<LastElement<Operators>>

export function pipe<Input, Operators extends unknown[]> (...operators: PipeOperators<Operators, Input>): (input: Input) => PipeOperatorsOutput<Operators> {
  return operators as never // Runtime implementation.
}
