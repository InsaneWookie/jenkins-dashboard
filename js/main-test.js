

describe('Test', function() {
    beforeEach(module('myApp'));

    var cssChanger;
//
    beforeEach(inject(function(_cssChanger_){
        // The injector unwraps the underscores (_) from around the parameter names when matching
        cssChanger = _cssChanger_;
    }));

    describe('$scope.grade', function() {
        it('sets the strength to "strong" if the password length is >8 chars', function() {

            spyOn(cssChanger, 'appendCssLink');


            cssChanger.start([
                {format: 'DDMM', value: '1210', cssHref: 'css/halloween.css'}
            ]);
            expect(cssChanger.appendCssLink).toHaveBeenCalled();
        });
    });
});