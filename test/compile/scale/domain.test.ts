/* tslint:disable:quotemark */


import {assert} from 'chai';
import {default as domain, unionDomains} from '../../../src/compile/scale/domain';
import {SOURCE, SUMMARY} from '../../../src/data';

import {parseUnitModel} from '../../util';
import {FieldRefUnionDomain, VgDataRef} from '../../../src/vega.schema';

describe('compile/scale', () => {
  describe('domain()', function() {
    it('should return domain for stack', function() {
      const model = parseUnitModel({
        mark: "bar",
        encoding: {
          y: {
            aggregate: 'sum',
            field: 'origin',
            type: 'quantitative'
          },
          x: {field: 'x', type: "ordinal"},
          color: {field: 'color', type: "ordinal"}
        }
      });

      const _domain = domain(model.scale('y'), model, 'y');

      assert.deepEqual(_domain, {
        data: 'stacked',
        fields: ['sum_origin_start', 'sum_origin_end']
      });
    });

    describe('for quantitative', function() {
      it('should return the right domain for binned Q',
        function() {
          const model = parseUnitModel({
            mark: "point",
            encoding: {
              y: {
                bin: {maxbins: 15},
                field: 'origin',
                scale: {domain: 'unaggregated'},
                type: "quantitative"
              }
            }
          });
          const _domain = domain(model.scale('y'), model, 'y');

          assert.deepEqual(_domain, {
            data: SOURCE,
            fields: [
              'bin_origin_start',
              'bin_origin_end'
            ]
          });
        });

      it('should return the unaggregated domain if requested for non-bin, non-sum Q',
        function() {
          const model = parseUnitModel({
            mark: "point",
            encoding: {
              y: {
                aggregate: 'mean',
                field: 'acceleration',
                scale: {domain: 'unaggregated'},
                type: "quantitative"
              }
            }
          });
          const _domain = domain(model.scale('y'), model, 'y') as FieldRefUnionDomain;

          assert.deepEqual(_domain.data, SUMMARY);
          assert.deepEqual(_domain.fields, ['min_acceleration', 'max_acceleration']);
        });

      it('should return the aggregated domain for sum Q',
        function() {
          const model = parseUnitModel({
            mark: "point",
            encoding: {
              y: {
                aggregate: 'sum',
                field: 'origin',
                scale: {domain: 'unaggregated'},
                type: "quantitative"
              }
            }
          });
          const _domain = domain(model.scale('y'), model, 'y') as VgDataRef;

          assert.deepEqual(_domain.data, SUMMARY);
        });

      it('should return the right custom domain', () => {
        const model = parseUnitModel({
          mark: "point",
          encoding: {
            y: {
              field: 'horsepower',
              type: "quantitative",
              scale: {domain: [0,200]}
            }
          }
        });
        const _domain = domain(model.scale('y'), model, 'y');

        assert.deepEqual(_domain, [0, 200]);
      });

      it('should return the aggregated domain if we do not overrride it', function() {
        const model = parseUnitModel({
          mark: "point",
          encoding: {
            y: {
              aggregate: 'min',
              field: 'origin',
              type: "quantitative"
            }
          }
        });
        const _domain = domain(model.scale('y'), model, 'y') as VgDataRef;

        assert.deepEqual(_domain.data, SUMMARY);
      });

      it('should return the aggregated domain if specified in config', function() {
        const model = parseUnitModel({
          mark: "point",
          encoding: {
            y: {
              aggregate: 'min',
              field: 'acceleration',
              type: "quantitative"
            }
          },
          config: {
            scale: {
              useUnaggregatedDomain: true
            }
          }
        });
        const _domain = domain(model.scale('y'), model, 'y') as FieldRefUnionDomain;

        assert.deepEqual(_domain.data, SUMMARY);
        assert.deepEqual(_domain.fields, ['min_acceleration', 'max_acceleration']);
      });
    });

    describe('for time', function() {
      it('should return the unaggregated domain if requested for raw T',
        function() {
          const model = parseUnitModel({
            mark: "point",
            encoding: {
              y: {
                field: 'origin',
                scale: {domain: 'unaggregated'},
                type: "temporal"
              }
            }
          });
          const _domain = domain(model.scale('y'), model, 'y') as FieldRefUnionDomain;

          assert.deepEqual(_domain.data, SOURCE);
        });

      it('should return the unaggregated domain if requested for year T',
        function() {
          const model = parseUnitModel({
            mark: "point",
            encoding: {
              y: {
                field: 'origin',
                scale: {domain: 'unaggregated'},
                type: "temporal",
                timeUnit: 'year'
              }
            }
          });
          const _domain = domain(model.scale('y'), model, 'y') as VgDataRef;

          assert.deepEqual(_domain.data, SOURCE);
          assert.operator((_domain.field as string).indexOf('year'), '>', -1);
        });

      it('should return the correct domain for month T',
        function() {
          const model = parseUnitModel({
            mark: "point",
            encoding: {
              y: {
                field: 'origin',
                type: "temporal",
                timeUnit: 'month'
              }
            }
          });
          const _domain = domain(model.scale('y'), model, 'y');

          assert.deepEqual(_domain, {data: 'source', field: 'month_origin', sort: {field: 'month_origin', op: 'min',}});
        });

        it('should return the correct domain for yearmonth T',
          function() {
            const model = parseUnitModel({
              mark: "point",
              encoding: {
                y: {
                  field: 'origin',
                  type: "temporal",
                  timeUnit: 'yearmonth'
                }
              }
            });
            const _domain = domain(model.scale('y'), model, 'y');

            assert.deepEqual(_domain, {
              data: 'source', field: 'yearmonth_origin',
              sort: {field: 'yearmonth_origin', op: 'min'}
            });
          });

      it('should return the right custom domain with DateTime objects', () => {
        const model = parseUnitModel({
          mark: "point",
          encoding: {
            y: {
              field: 'year',
              type: "temporal",
              scale: {domain: [{year: 1970}, {year: 1980}]}
            }
          }
        });
        const _domain = domain(model.scale('y'), model, 'y');

        assert.deepEqual(_domain, [
          new Date(1970, 0, 1).getTime(),
          new Date(1980, 0, 1).getTime()
        ]);
      });
    });

    describe('for ordinal', function() {
      it('should return correct domain with the provided sort property', function() {
        const sortDef = {op: 'min' as 'min', field:'Acceleration'};
        const model = parseUnitModel({
            mark: "point",
            encoding: {
              y: {field: 'origin', type: "ordinal", sort: sortDef}
            }
          });

        assert.deepEqual(domain(model.scale('y'), model, 'y'), {
            data: "source",
            field: 'origin',
            sort: sortDef
          });
      });

      it('should return correct domain without sort if sort is not provided', function() {
        const model = parseUnitModel({
          mark: "point",
          encoding: {
            y: {field: 'origin', type: "ordinal"}
          }
        });

        assert.deepEqual(domain(model.scale('y'), model, 'y'), {
          data: "source",
          field: 'origin',
          sort: true
        });
      });
    });
  });

  describe('unionDomains()', () => {
    it('should union field and data ref union domains', () => {
      const domain1 = {
        data: 'foo',
        fields: ['a', 'b']
      };

      const domain2 = {
        fields: [{
          data: 'foo',
          field: 'b'
        },{
          data: 'foo',
          field: 'c'
        }]
      };

      const unioned = unionDomains(domain1, domain2);
      assert.deepEqual(unioned, {
        data: 'foo',
        fields: ['a', 'b', 'c']
      });
    });
  });
});
