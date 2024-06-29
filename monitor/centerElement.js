function centerElement(elementIdToCenter) {
    if(elementIdToCenter == null)	return;
    const toCenter = document.getElementById(elementIdToCenter);
    const width = toCenter.getWidth();
    const height = toCenter.getHeight();
    const elementParent = toCenter.ancestors();
    const Pwidth = elementParent[0].getWidth();
    const Pheight = elementParent[0].getHeight();
    width = parseInt(Pwidth/2, 10) - parseInt(width/2, 10);
    height = parseInt(Pheight/2, 10) - parseInt(height/2, 10);
    toCenter.setStyle({'top': height + 'px'});
    toCenter.setStyle({'left': width + 'px'});
}
module.exports=centerElement
