import * as postcss from 'postcss';
import { Dictionary, MultiDictionary } from 'typescript-collections';

import { ParsedSelector } from '../../parseSelector';
import { RuleScope } from '../util';
import { DeclarationInfo } from './StyleInfo';

export class OptimizationContext {
  /**
   * The key for this optimization context that allows it to be merged across
   * distinct stylesheet regions.
   */
  key: string;
  /** atrule scopes for this context. All are functionally equivalent. */
  scopes: Array<RuleScope>;

  /** runtime selector scoping for this context. */
  selectorContext: ParsedSelector | undefined;
  root: postcss.Root;

  /**
   * map of property keys to a dictionary of values multi-mapped to
   * the selector information that references them. The multi-mapped values
   * are in the order of stylesheet precedence.
   */
  declarationMap: Dictionary<string, MultiDictionary<string, DeclarationInfo>>;

  /**
   * A set of properties that are declared within this optimization context.
   */
  authoredProps: Set<string>;

  constructor(key: string, scope: RuleScope, root: postcss.Root, selectorContext: ParsedSelector | undefined) {
    this.key = key;
    this.scopes = [scope];
    this.root = root;
    this.selectorContext = selectorContext;
    this.declarationMap = new Dictionary<string, MultiDictionary<string, DeclarationInfo>>();
    this.authoredProps = new Set();
  }

  getDeclarationValues(prop: string): MultiDictionary<string, DeclarationInfo> {
    let valueInfo: MultiDictionary<string, DeclarationInfo>;
    if (this.declarationMap.containsKey(prop)) {
      valueInfo = this.declarationMap.getValue(prop);
    } else {
      valueInfo = new MultiDictionary<string, DeclarationInfo>();
      this.declarationMap.setValue(prop, valueInfo);
    }
    return valueInfo;
  }
}

export class OptimizationContexts {
  private contexts: {
    [key: string]: OptimizationContext;
  };
  constructor(){
    this.contexts = {};
  }

  *[Symbol.iterator](): IterableIterator<OptimizationContext> {
    for (let key in this.contexts) {
      yield this.contexts[key];
    }
  }

  getContext(root: postcss.Root, scope: RuleScope, selectorContext: ParsedSelector | undefined) {
    let selectorContextStr = (selectorContext || "").toString();
    let key = this.getKey(scope, selectorContextStr);
    let context = this.contexts[key];
    if (context) {
      if (context.scopes.indexOf(scope) < 0) {
        context.scopes.push(scope);
      }
    } else {
      context = new OptimizationContext(key, scope, root, selectorContext);
      this.contexts[key] = context;
    }
    return context;
  }
  getKey(scope: RuleScope, selectorContext: string | undefined): string {
    let key = scope.map(atrule => `@${atrule.name} ${atrule.params}`);
    key.sort((a, b) => a.localeCompare(b));
    if (selectorContext) key.push(selectorContext);
    return key.join(" >> ");
  }
}