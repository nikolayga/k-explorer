$(document).ready(function() {
	feather.replace()
	
	if($('#deposites').length>0){
		$('#deposites').DataTable({
			columnDefs: [
			  { targets: 'no-sort', orderable: false }
			],
			 "order": [[ 0, "desc" ]]
		});
	}
});
	
$(window).on('load', function(){ 
	$('#status').fadeOut();
    $('#preloader').delay(50).fadeOut(100);
    $('body').delay(50).css({'overflow':'visible'});
});

$(document).on('click','ul._bar_tabs li',function(){
	$('ul._bar_tabs li').removeClass('active');
	$(this).addClass('active');
});